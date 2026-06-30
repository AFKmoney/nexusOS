// ═══════════════════════════════════════════════════════════════════
// PLUGIN MARKETPLACE — Community app and agent distribution
//
// A decentralized marketplace where the community can publish and
// install apps, agents, and tools for NexusOS. Each plugin is a
// self-contained HTML file (for apps) or a JSON manifest (for agents)
// that gets downloaded into the VFS and registered in the app registry.
//
// The marketplace server is a simple static JSON index — anyone can
// host one. The default registry is community-maintained, but users
// can configure custom registries in Settings.
//
// Plugin lifecycle:
//   1. Author creates a plugin (app or agent manifest)
//   2. Publishes to a registry (POST to registry URL)
//   3. Other users browse the registry in AppStore
//   4. Install = download to VFS + register in appRegistry
//   5. Update = check for newer version + re-install
// ═══════════════════════════════════════════════════════════════════

import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { useOS } from '../store/osStore';
import { eventBus } from './eventBus';
import { kernelLog } from './log';

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: 'app' | 'agent' | 'tool' | 'theme' | 'wallpaper';
  icon?: string;
  downloadUrl: string;
  homepage?: string;
  installed?: boolean;
  installedVersion?: string;
  /**
   * True when this plugin was produced on-demand by the AI app generator
   * (rather than fetched from a remote registry). Used by the marketplace
   * UI to show an "AI" badge and to allow deletion.
   */
  isGenerated?: boolean;
}

export interface MarketplaceRegistry {
  url: string;
  name: string;
  trusted: boolean;
}

const REGISTRY_KEY = 'nexusos_registries';
const DEFAULT_REGISTRY = 'https://raw.githubusercontent.com/AFKmoney/nexusOS-plugins/main/index.json';

class PluginMarket {
  private registries: MarketplaceRegistry[] = [];
  private cache: Map<string, MarketplacePlugin[]> = new Map();

  init(): void {
    try {
      const stored = localStorage.getItem(REGISTRY_KEY);
      if (stored) {
        this.registries = JSON.parse(stored);
      } else {
        this.registries = [{ url: DEFAULT_REGISTRY, name: 'Official', trusted: true }];
        this.saveRegistries();
      }
    } catch {
      this.registries = [{ url: DEFAULT_REGISTRY, name: 'Official', trusted: true }];
    }
  }

  getRegistries(): MarketplaceRegistry[] {
    return [...this.registries];
  }

  addRegistry(url: string, name: string, trusted = false): void {
    if (this.registries.find(r => r.url === url)) return;
    this.registries.push({ url, name, trusted });
    this.saveRegistries();
    this.cache.delete(url);
  }

  removeRegistry(url: string): void {
    this.registries = this.registries.filter(r => r.url !== url);
    this.saveRegistries();
    this.cache.delete(url);
  }

  /**
   * Fetch the plugin index from all configured registries.
   */
  async fetchPlugins(): Promise<MarketplacePlugin[]> {
    const allPlugins: MarketplacePlugin[] = [];
    const installedSources = this.getInstalledSources();

    for (const registry of this.registries) {
      try {
        const plugins = await this.fetchRegistry(registry.url);
        for (const plugin of plugins) {
          plugin.installed = installedSources.has(plugin.id);
        }
        allPlugins.push(...plugins);
      } catch (e: any) {
        kernelLog.warn(`[Market] Failed to fetch registry ${registry.url}:`, e.message);
      }
    }

    return allPlugins;
  }

  private async fetchRegistry(url: string): Promise<MarketplacePlugin[]> {
    // Check cache (5 minute TTL)
    const cached = this.cache.get(url);
    if (cached && Date.now() - (cached as any)._fetchedAt < 300_000) {
      return cached;
    }

    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`Registry returned ${resp.status}`);
    const data = await resp.json();

    const plugins: MarketplacePlugin[] = Array.isArray(data) ? data : (data.plugins || []);
    (plugins as any)._fetchedAt = Date.now();
    this.cache.set(url, plugins);
    return plugins;
  }

  /**
   * Install a plugin: download it to the VFS and register it.
   */
  async install(plugin: MarketplacePlugin): Promise<boolean> {
    try {
      kernelLog.info(`[Market] Installing ${plugin.name} v${plugin.version}...`);

      // Download the plugin content
      const resp = await fetch(plugin.downloadUrl, { signal: AbortSignal.timeout(30000) });
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const content = await resp.text();

      // Save to VFS
      const installDir = this.getInstallDir(plugin.category);
      vfs.createDirRecursive(installDir, SYSTEM_VFS_APP_ID);
      const filePath = `${installDir}/${plugin.id}.html`;
      vfs.writeFile(filePath, content, SYSTEM_VFS_APP_ID);

      // Register in the OS store
      const store = useOS.getState();
      store.addCustomWallpaper?.(filePath); // for wallpaper category
      if (plugin.category === 'app') {
        store.addNotification?.({
          title: 'Plugin Installed',
          message: `${plugin.name} v${plugin.version} is ready. Find it in your app launcher.`,
          type: 'success',
        });
      }

      eventBus.emit('plugin:installed', plugin);
      kernelLog.info(`[Market] Installed ${plugin.name} to ${filePath}`);
      return true;
    } catch (e: any) {
      kernelLog.error(`[Market] Install failed for ${plugin.name}:`, e.message);
      eventBus.emit('plugin:install-failed', { plugin, error: e.message });
      return false;
    }
  }

  /**
   * Uninstall a plugin: remove from VFS and unregister.
   */
  uninstall(plugin: MarketplacePlugin): boolean {
    const installDir = this.getInstallDir(plugin.category);
    const filePath = `${installDir}/${plugin.id}.html`;
    const deleted = vfs.delete(filePath, SYSTEM_VFS_APP_ID);
    if (deleted) {
      eventBus.emit('plugin:uninstalled', plugin);
      kernelLog.info(`[Market] Uninstalled ${plugin.name}`);
    }
    return deleted;
  }

  /**
   * Publish a plugin to a registry. The registry server must accept
   * POST requests with the plugin manifest.
   */
  async publish(plugin: MarketplacePlugin, registryUrl: string): Promise<boolean> {
    try {
      const resp = await fetch(`${registryUrl}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plugin),
      });
      if (!resp.ok) throw new Error(`Publish failed: ${resp.status}`);
      eventBus.emit('plugin:published', plugin);
      kernelLog.info(`[Market] Published ${plugin.name} to ${registryUrl}`);
      return true;
    } catch (e: any) {
      kernelLog.error(`[Market] Publish failed:`, e.message);
      return false;
    }
  }

  private getInstallDir(category: MarketplacePlugin['category']): string {
    switch (category) {
      case 'app': return '/home/user/Apps';
      case 'agent': return '/home/user/Agents';
      case 'wallpaper': return '/home/user/Wallpapers';
      case 'theme': return '/system/themes';
      default: return '/home/user/Plugins';
    }
  }

  private getInstalledSources(): Set<string> {
    const sources = new Set<string>();
    const dirs = ['/home/user/Apps', '/home/user/Agents', '/home/user/Wallpapers', '/home/user/Plugins'];
    for (const dir of dirs) {
      const files = vfs.listDir(dir, SYSTEM_VFS_APP_ID) || [];
      for (const file of files) {
        // Plugin ID is the filename without extension
        sources.add(file.replace(/\.\w+$/, ''));
      }
    }
    return sources;
  }

  private saveRegistries(): void {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(this.registries));
  }

  /**
   * Return the static (built-in) plugin catalog. In the AI-managed
   * marketplace this is intentionally minimal — the focus is on
   * {@link generatePlugin} which produces plugins on demand.
   */
  getCatalog(): MarketplacePlugin[] {
    // No bundled static plugins for now — the AI generator is the
    // primary source of plugins. Remote registries are still
    // available via {@link fetchPlugins} for backward compatibility.
    return [];
  }

  /**
   * Ask the AI to generate a new plugin based on a description.
   * The AI generates the app code, and we install it.
   */
  async generatePlugin(description: string): Promise<{ success: boolean; appId?: string; error?: string }> {
    try {
      const { appGenerator } = await import('./appGenerator');
      const app = await appGenerator.generate(description);
      return { success: true, appId: app.appId };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Generation failed' };
    }
  }

  /**
   * Get available plugins. Combines the static catalog with
   * AI-generated suggestions based on what the user has installed.
   */
  async getAvailablePlugins(): Promise<MarketplacePlugin[]> {
    const staticPlugins = this.getCatalog();
    // Also include already-generated apps from the AppGenerator
    try {
      const { appGenerator } = await import('./appGenerator');
      const generated = appGenerator.list();
      const generatedPlugins: MarketplacePlugin[] = generated.map(manifest => {
        const plugin: MarketplacePlugin = {
          id: manifest.id,
          name: manifest.name,
          description: manifest.description,
          version: manifest.version,
          author: manifest.author,
          category: (manifest.category as MarketplacePlugin['category']) || 'app',
          downloadUrl: '', // not applicable — already in VFS
          installed: true, // already generated = installed
        };
        plugin.isGenerated = true;
        if (manifest.icon) plugin.icon = manifest.icon;
        return plugin;
      });
      return [...generatedPlugins, ...staticPlugins];
    } catch {
      return staticPlugins;
    }
  }
}

export const pluginMarket = new PluginMarket();
