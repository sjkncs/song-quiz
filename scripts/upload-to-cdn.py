"""
Upload audio and cover files to Supabase Storage CDN.

Usage:
1. Set SUPABASE_SERVICE_ROLE_KEY in .env.local
2. Run: python scripts/upload-to-cdn.py

This will upload all 42 .m4a audio files and 42 .jpg cover images
to the Supabase Storage buckets, then update the database song URLs.
"""

import os
import sys
import json
import requests
from pathlib import Path

# Load env
def load_env():
    env = {}
    env_path = Path(__file__).parent.parent / '.env.local'
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    env[key.strip()] = value.strip()
    return env

def main():
    env = load_env()

    project_url = env.get('NEXT_PUBLIC_SUPABASE_URL', '')
    service_key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

    if not project_url or not service_key or service_key == 'your-service-role-key':
        print("ERROR: Please set SUPABASE_SERVICE_ROLE_KEY in .env.local first")
        print("Get it from: Supabase Dashboard > Settings > API > service_role key")
        sys.exit(1)

    headers = {
        'Authorization': f'Bearer {service_key}',
        'apikey': service_key,
    }

    audio_dir = Path(__file__).parent.parent / 'public' / 'audio'
    covers_dir = Path(__file__).parent.parent / 'public' / 'covers'

    uploaded_audio = 0
    uploaded_covers = 0

    # Upload audio files
    print("=== Uploading audio files ===")
    for f in sorted(audio_dir.glob('cantopop_*.m4a')):
        bucket_path = f'audio/{f.name}'
        url = f'{project_url}/storage/v1/object/{bucket_path}'

        # Check if already exists
        check = requests.head(url, headers=headers)
        if check.status_code == 200:
            print(f'  SKIP (exists): {f.name}')
            uploaded_audio += 1
            continue

        with open(f, 'rb') as fh:
            resp = requests.post(
                f'{project_url}/storage/v1/object/{bucket_path}',
                headers={**headers, 'Content-Type': 'audio/mp4', 'x-upsert': 'true'},
                data=fh.read()
            )
        if resp.status_code in (200, 201):
            print(f'  OK: {f.name} ({f.stat().st_size // 1024}KB)')
            uploaded_audio += 1
        else:
            print(f'  FAIL: {f.name} - {resp.status_code} {resp.text[:100]}')

    # Upload cover images
    print("\n=== Uploading cover images ===")
    for f in sorted(covers_dir.glob('cantopop_*.jpg')):
        bucket_path = f'covers/{f.name}'
        url = f'{project_url}/storage/v1/object/{bucket_path}'

        check = requests.head(url, headers=headers)
        if check.status_code == 200:
            print(f'  SKIP (exists): {f.name}')
            uploaded_covers += 1
            continue

        with open(f, 'rb') as fh:
            resp = requests.post(
                f'{project_url}/storage/v1/object/{bucket_path}',
                headers={**headers, 'Content-Type': 'image/jpeg', 'x-upsert': 'true'},
                data=fh.read()
            )
        if resp.status_code in (200, 201):
            print(f'  OK: {f.name} ({f.stat().st_size // 1024}KB)')
            uploaded_covers += 1
        else:
            print(f'  FAIL: {f.name} - {resp.status_code} {resp.text[:100]}')

    print(f"\n=== Summary ===")
    print(f"Audio:  {uploaded_audio}/42 uploaded")
    print(f"Covers: {uploaded_covers}/42 uploaded")

    if uploaded_audio == 42:
        cdn_base = f'{project_url}/storage/v1/object/public'
        print(f"\nCDN base URL: {cdn_base}")
        print(f"Audio example: {cdn_base}/audio/cantopop_01.m4a")
        print(f"Cover example: {cdn_base}/covers/cantopop_01.jpg")
        print("\nNext step: Update database song URLs with:")
        print(f"  UPDATE songs SET audio_url = REPLACE(audio_url, '/audio', '{cdn_base}/audio');")
        print(f"  UPDATE songs SET artwork_url = REPLACE(artwork_url, '/covers', '{cdn_base}/covers');")

if __name__ == '__main__':
    main()
