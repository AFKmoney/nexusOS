# NexusOS Growth Tracker

This script helps you track and visualize the growth of your NexusOS repository over time.

## Installation

First, install the required dependencies:

```bash
pip install requests matplotlib pandas python-dateutil
```

## Configuration

Create a file called `.env` in your project directory with your GitHub token:

```
GITHUB_TOKEN=your_github_personal_access_token
```

## Growth Tracking Script

```python
import requests
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Configuration
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
REPO_OWNER = "AFKmoney"
REPO_NAME = "nexusOS"

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

def get_repo_stats():
    """Get current repository statistics"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "stars": data["stargazers_count"],
            "forks": data["forks_count"],
            "open_issues": data["open_issues_count"],
            "subscribers": data["subscribers_count"],
            "size": data["size"],
            "watchers": data["watchers_count"]
        }
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

def get_traffic_stats():
    """Get repository traffic statistics"""
    # Note: Traffic data is only available for the last 14 days
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/traffic/views"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "views_count": data.get("count", 0),
            "views_uniques": data.get("uniques", 0),
            "views_per_day": data.get("views", [])
        }
    else:
        print(f"Traffic data error: {response.status_code}")
        return {"views_count": 0, "views_uniques": 0, "views_per_day": []}

def get_clones_stats():
    """Get repository clone statistics"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/traffic/clones"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "clones_count": data.get("count", 0),
            "clones_uniques": data.get("uniques", 0),
            "clones_per_day": data.get("clones", [])
        }
    else:
        print(f"Clone data error: {response.status_code}")
        return {"clones_count": 0, "clones_uniques": 0, "clones_per_day": []}

def save_stats(stats, traffic, clones):
    """Save stats to a JSON file"""
    filename = "nexusos_growth_data.json"
    
    # Load existing data
    existing_data = []
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            existing_data = json.load(f)
    
    # Add new data point
    new_entry = {
        "date": stats["date"],
        "repo_stats": stats,
        "traffic_stats": traffic,
        "clone_stats": clones
    }
    
    existing_data.append(new_entry)
    
    # Save updated data
    with open(filename, 'w') as f:
        json.dump(existing_data, f, indent=2)
    
    print(f"Saved stats for {stats['date']}")

def load_historical_data():
    """Load historical data from JSON file"""
    filename = "nexusos_growth_data.json"
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return []

def plot_growth(data):
    """Plot growth metrics over time"""
    if not data:
        print("No data to plot")
        return
    
    dates = [entry["date"] for entry in data]
    stars = [entry["repo_stats"]["stars"] for entry in data]
    forks = [entry["repo_stats"]["forks"] for entry in data]
    views = [entry["traffic_stats"]["views_count"] for entry in data]
    clones = [entry["clone_stats"]["clones_count"] for entry in data]
    
    fig, axs = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('NexusOS Repository Growth Metrics', fontsize=16)
    
    # Stars over time
    axs[0, 0].plot(dates, stars, marker='o', color='gold')
    axs[0, 0].set_title('Stars Over Time')
    axs[0, 0].set_ylabel('Number of Stars')
    axs[0, 0].tick_params(axis='x', rotation=45)
    
    # Forks over time
    axs[0, 1].plot(dates, forks, marker='s', color='lightcoral')
    axs[0, 1].set_title('Forks Over Time')
    axs[0, 1].set_ylabel('Number of Forks')
    axs[0, 1].tick_params(axis='x', rotation=45)
    
    # Views over time
    axs[1, 0].plot(dates, views, marker='^', color='lightblue')
    axs[1, 0].set_title('Views Over Time')
    axs[1, 0].set_ylabel('Number of Views')
    axs[1, 0].tick_params(axis='x', rotation=45)
    
    # Clones over time
    axs[1, 1].plot(dates, clones, marker='d', color='lightgreen')
    axs[1, 1].set_title('Clones Over Time')
    axs[1, 1].set_ylabel('Number of Clones')
    axs[1, 1].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig('nexusos_growth_chart.png', dpi=300, bbox_inches='tight')
    plt.show()

def calculate_growth_rate(data):
    """Calculate growth rates"""
    if len(data) < 2:
        return {}
    
    first = data[0]["repo_stats"]
    last = data[-1]["repo_stats"]
    
    days = (datetime.strptime(last["date"], "%Y-%m-%d") - datetime.strptime(first["date"], "%Y-%m-%d")).days
    if days == 0:
        days = 1  # Avoid division by zero
    
    star_growth = ((last["stars"] - first["stars"]) / first["stars"] * 100) if first["stars"] > 0 else 0
    fork_growth = ((last["forks"] - first["forks"]) / first["forks"] * 100) if first["forks"] > 0 else 0
    
    avg_star_daily_growth = (last["stars"] - first["stars"]) / days
    avg_fork_daily_growth = (last["forks"] - first["forks"]) / days
    
    return {
        "total_days": days,
        "star_growth_percent": round(star_growth, 2),
        "fork_growth_percent": round(fork_growth, 2),
        "avg_star_daily_growth": round(avg_star_daily_growth, 2),
        "avg_fork_daily_growth": round(avg_fork_daily_growth, 2),
        "final_stars": last["stars"],
        "final_forks": last["forks"]
    }

def main():
    print("Fetching current NexusOS repository statistics...")
    
    # Get current stats
    repo_stats = get_repo_stats()
    if not repo_stats:
        print("Failed to get repository stats. Check your token and connection.")
        return
    
    traffic_stats = get_traffic_stats()
    clone_stats = get_clones_stats()
    
    # Save stats
    save_stats(repo_stats, traffic_stats, clone_stats)
    
    # Load historical data
    historical_data = load_historical_data()
    
    # Calculate growth metrics
    growth_metrics = calculate_growth_rate(historical_data)
    
    # Print summary
    print("\n" + "="*50)
    print("NEXUSOS GROWTH SUMMARY")
    print("="*50)
    print(f"Current Stats ({repo_stats['date']}):")
    print(f"  Stars: {repo_stats['stars']}")
    print(f"  Forks: {repo_stats['forks']}")
    print(f"  Views: {traffic_stats['views_count']}")
    print(f"  Clones: {clone_stats['clones_count']}")
    print(f"  Open Issues: {repo_stats['open_issues']}")
    print(f"  Subscribers: {repo_stats['subscribers']}")
    
    if growth_metrics:
        print(f"\nGrowth Metrics (over {growth_metrics['total_days']} days):")
        print(f"  Star Growth: {growth_metrics['star_growth_percent']}%")
        print(f"  Fork Growth: {growth_metrics['fork_growth_percent']}%")
        print(f"  Avg Daily Star Gain: {growth_metrics['avg_star_daily_growth']}")
        print(f"  Avg Daily Fork Gain: {growth_metrics['avg_fork_daily_growth']}")
    
    print("\nPlotting growth chart...")
    plot_growth(historical_data)
    
    print("\nGrowth data saved to 'nexusos_growth_data.json'")
    print("Growth chart saved to 'nexusos_growth_chart.png'")

if __name__ == "__main__":
    main()
```

## Usage Instructions

1. **Setup**:
   - Install required packages: `pip install requests matplotlib pandas python-dateutil python-dotenv`
   - Create a GitHub Personal Access Token with repo permissions
   - Create a `.env` file with your token

2. **Run the tracker**:
   ```bash
   python nexusos_tracker.py
   ```

3. **Schedule regular tracking**:
   You can schedule this script to run daily using cron (Linux/Mac) or Task Scheduler (Windows) to track your growth over time.

## Additional Tracking Tools

### Virality Score Calculator

```python
def calculate_virality_score(stars, forks, subscribers, views, clones, days_since_creation):
    """
    Calculate a virality score based on multiple metrics
    Score ranges from 0 to 100
    """
    # Normalize each metric based on days since creation
    star_rate = stars / days_since_creation * 7  # Per week equivalent
    fork_rate = forks / days_since_creation * 7
    subscriber_rate = subscribers / days_since_creation * 7
    view_rate = views / days_since_creation * 7
    clone_rate = clones / days_since_creation * 7
    
    # Weighted score calculation
    # Stars: 30%, Forks: 25%, Subscribers: 20%, Views: 15%, Clones: 10%
    weighted_score = (
        min(star_rate * 0.30, 30) +
        min(fork_rate * 0.25, 25) +
        min(subscriber_rate * 0.20, 20) +
        min(view_rate * 0.15, 15) +
        min(clone_rate * 0.10, 10)
    )
    
    # Cap at 100
    return min(weighted_score, 100)

# Example usage:
# virality = calculate_virality_score(150, 45, 30, 1200, 200, 30)
# print(f"Virality Score: {virality:.2f}/100")
```

This growth tracker will help you monitor how your promotional efforts are impacting the visibility and adoption of your NexusOS repository. It tracks key metrics over time and provides visualizations to help you understand trends and the effectiveness of your promotional campaigns.