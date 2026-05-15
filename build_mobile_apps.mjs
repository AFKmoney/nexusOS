import fs from 'fs';

const desktopAppsDir = './apps';
const mobileAppsDir = './NexusPortable/apps';

const desktopApps = fs.readdirSync(desktopAppsDir).filter(f => f.endsWith('.tsx') && !f.startsWith('Mobile') && f !== 'types.ts');
const mobileApps = fs.readdirSync(mobileAppsDir).filter(f => f.startsWith('Mobile') && f.endsWith('.tsx'));

const missingApps = desktopApps.filter(app => {
    const baseName = app.replace('.tsx', '');
    const mobileName = `Mobile${baseName}.tsx`;
    const mobileName2 = `Mobile${baseName.replace('App', '')}.tsx`;
    return !mobileApps.includes(mobileName) && !mobileApps.includes(mobileName2);
});

console.log(missingApps.join(', '));
