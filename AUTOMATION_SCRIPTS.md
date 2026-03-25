# NexusOS Automation Scripts

This directory contains scripts to help automate various aspects of your promotional campaign for NexusOS.

## Social Media Automation

### Twitter/X Auto-Poster
```python
import tweepy
import schedule
import time
import json
from datetime import datetime

# Configuration
TWITTER_API_KEY = "your_api_key"
TWITTER_API_SECRET = "your_api_secret"
TWITTER_ACCESS_TOKEN = "your_access_token"
TWITTER_ACCESS_SECRET = "your_access_secret"

# Initialize Twitter API
auth = tweepy.OAuthHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
api = tweepy.API(auth)

def post_tweet(tweet_text):
    """Post a tweet to Twitter"""
    try:
        api.update_status(tweet_text)
        print(f"Tweet posted successfully at {datetime.now()}: {tweet_text[:50]}...")
    except Exception as e:
        print(f"Error posting tweet: {e}")

def scheduled_tweets():
    """List of tweets to be posted"""
    tweets = [
        "🚀 Just discovered @NexusOS_AI - a revolutionary 100% offline AI desktop OS that puts data sovereignty first. Time to break free from cloud dependency? #AI #Privacy #OpenSource",
        "💡 NexusOS Feature Highlight: Our DAEMON AI operates at the kernel level, monitoring and optimizing your system in real-time without any cloud connection. True autonomy for your computing experience. #SelfHosted #AI",
        "🤔 Traditional AI apps rely on cloud APIs that harvest your data. NexusOS runs entirely on your local machine with zero telemetry. Your data stays yours. #DataSovereignty #PrivacyFirst",
        "🔬 Technical insight: NexusOS uses a fractal state architecture where our DAEMON AI operates at the kernel level, creating a continuous feedback loop. #TechDeepDive #Electron",
        "🌟 Love the idea of 100% offline AI? Star our repo if you believe in digital sovereignty! Every star helps us compete against Big Tech's algorithmic chokehold. #OpenSource #GitHub"
    ]
    return tweets

def job():
    tweets = scheduled_tweets()
    # Post a random tweet from the list
    import random
    tweet = random.choice(tweets)
    post_tweet(tweet)

# Schedule tweets to be posted twice daily
schedule.every().monday.at("09:00").do(job)
schedule.every().monday.at("15:00").do(job)
schedule.every().tuesday.at("09:00").do(job)
schedule.every().tuesday.at("15:00").do(job)
schedule.every().wednesday.at("09:00").do(job)
schedule.every().wednesday.at("15:00").do(job)
schedule.every().thursday.at("09:00").do(job)
schedule.every().thursday.at("15:00").do(job)
schedule.every().friday.at("09:00").do(job)
schedule.every().friday.at("15:00").do(job)
schedule.every().saturday.at("10:00").do(job)
schedule.every().sunday.at("10:00").do(job)

while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute
```

### LinkedIn Auto-Poster
```python
import requests
import schedule
import time
from datetime import datetime

# Configuration
LINKEDIN_ACCESS_TOKEN = "your_linkedin_access_token"

def post_linkedin(update_text):
    """Post an update to LinkedIn"""
    url = "https://api.linkedin.com/v2/ugcPosts"
    
    headers = {
        "Authorization": f"Bearer {LINKEDIN_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    
    payload = {
        "author": "urn:li:person:<PERSON_ID>",  # Replace with your LinkedIn person ID
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": update_text
                },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 201:
            print(f"LinkedIn post successful at {datetime.now()}")
        else:
            print(f"LinkedIn post failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error posting to LinkedIn: {e}")

def scheduled_linkedin_posts():
    """List of LinkedIn posts to be shared"""
    posts = [
        "I'm excited to share NexusOS - a revolutionary approach to AI desktop environments that prioritizes data sovereignty. In an era where our data is constantly harvested, we need solutions that operate 100% offline. NexusOS hosts an autonomous AI entity (DAEMON) that runs entirely on your local machine with no cloud dependencies. The AI operates at the kernel level, providing real-time system optimization without compromising privacy. This represents the future of personal AI - one that serves the user without serving the data to corporations. #AI #Privacy #DataSovereignty #OpenSource",
        "Data sovereignty is becoming increasingly important as AI becomes more prevalent in our daily lives. That's why I've been working on NexusOS - a desktop OS that runs 100% offline with no cloud dependencies. Unlike traditional AI apps that rely on cloud APIs, NexusOS operates entirely on your local machine, ensuring your data stays yours. The autonomous DAEMON AI operates at the kernel level, providing real-time optimization without compromising privacy. #PrivacyFirst #LocalAI #DataSovereignty",
        "The future of AI lies in decentralized, private, and autonomous systems. NexusOS represents this future with its 100% offline operation and kernel-level AI functionality. By keeping AI processing on the user's device, we eliminate the risks of data harvesting and cloud dependency. This is the beginning of a new era in personal computing where users have complete control over their AI interactions. #AI #FutureOfTech #Privacy"
    ]
    return posts

def linkedin_job():
    import random
    post = random.choice(scheduled_linkedin_posts())
    post_linkedin(post)

# Schedule LinkedIn posts to be posted daily
schedule.every().monday.at("08:00").do(linkedin_job)
schedule.every().wednesday.at("08:00").do(linkedin_job)
schedule.every().friday.at("08:00").do(linkedin_job)

while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute
```

### Reddit Auto-Poster
```python
import praw
import schedule
import time
from datetime import datetime

# Configuration
REDDIT_CLIENT_ID = "your_reddit_client_id"
REDDIT_CLIENT_SECRET = "your_reddit_client_secret"
REDDIT_USERNAME = "your_reddit_username"
REDDIT_PASSWORD = "your_reddit_password"

# Initialize Reddit API
reddit = praw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    username=REDDIT_USERNAME,
    password=REDDIT_PASSWORD,
    user_agent="NexusOS Bot 1.0"
)

def post_to_reddit(title, content, subreddit):
    """Post to a specific subreddit"""
    try:
        subreddit_obj = reddit.subreddit(subreddit)
        submission = subreddit_obj.submit(title=title, selftext=content)
        print(f"Reddit post successful at {datetime.now()}: {submission.url}")
    except Exception as e:
        print(f"Error posting to Reddit: {e}")

def scheduled_reddit_posts():
    """List of Reddit posts to be shared"""
    posts = [
        {
            "title": "I built a 100% offline AI desktop OS that runs without any cloud dependencies - NexusOS",
            "content": "Hi ML community,\n\nI wanted to share a project I've been working on: NexusOS - a desktop OS that hosts an autonomous AI entity called DAEMON. It runs completely offline with no cloud dependencies.\n\nUnlike traditional AI apps that rely on cloud APIs, this runs entirely on your local machine using WebAssembly. The AI operates at the kernel level, monitoring and optimizing your system in real-time.\n\nSome key features:\n- 100% offline operation\n- Zero telemetry or data collection\n- Dual execution modes (connect to local LLMs or run models natively)\n- Virtual File System with persistent storage\n\nWould love your thoughts and feedback! The project is open source on GitHub.\n\nGitHub: https://github.com/AFKmoney/nexusOS",
            "subreddit": "MachineLearning"
        },
        {
            "title": "NexusOS - A 100% offline AI desktop environment for complete data sovereignty",
            "content": "Hey self-hosters,\n\nI've been working on NexusOS - a desktop OS that hosts an autonomous AI entity called DAEMON. It's designed to run entirely on your local machine with no external dependencies.\n\nKey features:\n- Runs as a native Electron application\n- No cloud dependencies whatsoever\n- Can connect to local LLMs (LM Studio) or run models natively via WebAssembly\n- Virtual File System for persistent storage\n- Kernel-level AI operations\n\nThe philosophy is complete data sovereignty - your AI interactions stay on your machine. Would appreciate feedback from the community!\n\nGitHub: https://github.com/AFKmoney/nexusOS",
            "subreddit": "selfhosted"
        }
    ]
    return posts

def reddit_job():
    import random
    post = random.choice(scheduled_reddit_posts())
    post_to_reddit(post['title'], post['content'], post['subreddit'])

# Schedule Reddit posts to be posted 3 times per week
schedule.every().tuesday.at("10:00").do(reddit_job)
schedule.every().thursday.at("10:00").do(reddit_job)
schedule.every().saturday.at "10:00".do(reddit_job)

while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute
```

## GitHub Engagement Automation

### Issue and PR Response Bot
```python
import requests
import time
from datetime import datetime

# Configuration
GITHUB_TOKEN = "your_github_token"
REPO_OWNER = "AFKmoney"
REPO_NAME = "nexusOS"

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

def get_recent_issues():
    """Get recently opened issues"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    params = {
        "state": "open",
        "sort": "created",
        "direction": "desc",
        "per_page": 10
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()

def get_recent_prs():
    """Get recently opened pull requests"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/pulls"
    params = {
        "state": "open",
        "sort": "created",
        "direction": "desc",
        "per_page": 10
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()

def respond_to_issue(issue_number, comment):
    """Respond to an issue with a comment"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue_number}/comments"
    data = {"body": comment}
    response = requests.post(url, headers=headers, json=data)
    return response.status_code == 201

def respond_to_pr(pr_number, comment):
    """Respond to a pull request with a comment"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{pr_number}/comments"
    data = {"body": comment}
    response = requests.post(url, headers=headers, json=data)
    return response.status_code == 201

def process_new_interactions():
    """Process new issues and PRs"""
    print(f"Checking for new interactions at {datetime.now()}")
    
    # Process new issues
    issues = get_recent_issues()
    for issue in issues:
        if issue.get('pull_request') is None:  # Not a pull request
            # Check if we've already responded (by looking for our bot's comment)
            comments_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue['number']}/comments"
            comments_response = requests.get(comments_url, headers=headers)
            comments = comments_response.json()
            
            # Check if we've already responded
            already_responded = any(
                comment['user']['login'] == 'your_bot_username' for comment in comments
            )
            
            if not already_responded:
                response_comment = (
                    "Thank you for opening this issue! We appreciate your feedback and will review it shortly. "
                    "In the meantime, please check out our [contributing guidelines](https://github.com/AFKmoney/nexusOS/blob/main/CONTRIBUTING.md) "
                    "if you're interested in helping improve NexusOS. Your contributions help build a more sovereign digital future for everyone!"
                )
                
                if respond_to_issue(issue['number'], response_comment):
                    print(f"Responded to issue #{issue['number']}")
                else:
                    print(f"Failed to respond to issue #{issue['number']}")
    
    # Process new PRs
    prs = get_recent_prs()
    for pr in prs:
        # Check if we've already responded
        comments_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{pr['number']}/comments"
        comments_response = requests.get(comments_url, headers=headers)
        comments = comments_response.json()
        
        # Check if we've already responded
        already_responded = any(
            comment['user']['login'] == 'your_bot_username' for comment in comments
        )
        
        if not already_responded:
            response_comment = (
                "Thank you for your pull request! We appreciate your contribution to NexusOS. "
                "Our team will review your changes shortly. Please make sure you've followed our "
                "[contributing guidelines](https://github.com/AFKmoney/nexusOS/blob/main/CONTRIBUTING.md). "
                "Your contributions help strengthen digital sovereignty for everyone!"
            )
            
            if respond_to_pr(pr['number'], response_comment):
                print(f"Responded to PR #{pr['number']}")
            else:
                print(f"Failed to respond to PR #{pr['number']}")

# Run the interaction checker every 10 minutes
while True:
    process_new_interactions()
    time.sleep(600)  # 10 minutes
```

## Content Generation Automation

### Blog Post Generator
```python
import openai
from datetime import datetime
import os

# Configuration
OPENAI_API_KEY = "your_openai_api_key"
openai.api_key = OPENAI_API_KEY

def generate_blog_post(topic, keywords):
    """Generate a technical blog post about NexusOS"""
    prompt = f"""
    Write a detailed technical blog post about NexusOS on the topic: {topic}
    
    Include these keywords naturally throughout the post: {', '.join(keywords)}
    
    The post should be informative, technical but accessible, and highlight the benefits of 100% offline AI.
    Aim for 800-1200 words.
    
    Structure:
    - Introduction hook
    - Technical explanation
    - Benefits and use cases
    - Conclusion with call to action
    """
    
    try:
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=prompt,
            max_tokens=1500,
            temperature=0.7
        )
        
        return response.choices[0].text.strip()
    except Exception as e:
        print(f"Error generating blog post: {e}")
        return None

def save_blog_post(content, title):
    """Save the blog post to a file"""
    filename = f"blog_{title.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    filepath = os.path.join("blog_posts", filename)
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"# {title}\n\n")
        f.write(f"_Published on {datetime.now().strftime('%B %d, %Y')}_\n\n")
        f.write(content)
    
    print(f"Blog post saved to {filepath}")

# Example usage
topics_and_keywords = [
    ("The Future of Local AI Computing", ["local AI", "offline AI", "data sovereignty", "privacy"]),
    ("Building Autonomous AI Systems", ["autonomous AI", "DAEMON", "kernel-level", "self-evolving"]),
    ("WebAssembly for AI Applications", ["WebAssembly", "wllama", "browser AI", "client-side"])
]

for topic, keywords in topics_and_keywords:
    print(f"Generating blog post on: {topic}")
    post_content = generate_blog_post(topic, keywords)
    if post_content:
        save_blog_post(post_content, topic)
        print(f"Generated blog post on: {topic}")
    else:
        print(f"Failed to generate blog post on: {topic}")
    # Be respectful to API limits
    time.sleep(60)
```

## Analytics Automation

### Metrics Collection Script
```python
import requests
import csv
import time
from datetime import datetime

# Configuration
GITHUB_TOKEN = "your_github_token"
REPO_OWNER = "AFKmoney"
REPO_NAME = "nexusOS"

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

def get_repo_metrics():
    """Get current repository metrics"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "timestamp": datetime.now().isoformat(),
            "stars": data["stargazers_count"],
            "forks": data["forks_count"],
            "open_issues": data["open_issues_count"],
            "subscribers": data["subscribers_count"]
        }
    else:
        print(f"Error getting repo metrics: {response.status_code}")
        return None

def get_traffic_data():
    """Get repository traffic data"""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/traffic/views"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "views_total": data.get("count", 0),
            "unique_visitors": data.get("uniques", 0)
        }
    else:
        print(f"Error getting traffic data: {response.status_code}")
        return {"views_total": 0, "unique_visitors": 0}

def save_metrics(metrics, traffic):
    """Save metrics to CSV file"""
    filename = "nexusos_metrics.csv"
    file_exists = False
    
    try:
        with open(filename, 'r'):
            file_exists = True
    except FileNotFoundError:
        file_exists = False
    
    with open(filename, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['timestamp', 'stars', 'forks', 'open_issues', 'subscribers', 'views_total', 'unique_visitors']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        if not file_exists:
            writer.writeheader()
        
        row = {**metrics, **traffic}
        writer.writerow(row)

def collect_metrics():
    """Collect and save metrics"""
    print(f"Collecting metrics at {datetime.now()}")
    
    repo_metrics = get_repo_metrics()
    if repo_metrics:
        traffic_metrics = get_traffic_data()
        save_metrics(repo_metrics, traffic_metrics)
        print(f"Metrics collected - Stars: {repo_metrics['stars']}, Forks: {repo_metrics['forks']}")
    else:
        print("Failed to collect metrics")

# Collect metrics every hour
while True:
    collect_metrics()
    time.sleep(3600)  # 1 hour
```

## Usage Instructions

1. **Setup Environment**:
   - Install required packages: `pip install tweepy schedule praw requests openai`
   - Set up API keys for each platform
   - Configure the scripts with your credentials

2. **Run Automation Scripts**:
   - Each script runs independently
   - Monitor for errors and adjust posting frequency as needed
   - Respect platform rate limits

3. **Monitor Results**:
   - Track metrics using the analytics script
   - Adjust content based on engagement
   - Scale successful approaches

Remember to comply with each platform's terms of service and rate limits when using these automation scripts.