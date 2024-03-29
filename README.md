# Ongaku Ryoho

Music therapy.



## What does it do exactly?

A music player which connects to your cloud storage.

For example, say you have a Amazon S3 bucket with music on it.  
This application looks for all mp3, mp4 and m4a files in the bucket  
and then gets the music metadata from all those files.

So, in short:

1. Scans S3 bucket for mp3/mp4/m4a files
2. Gets music metadata for said files
3. Stores metadata and file tree locally and on Firebase
4. Shows list of all added music (from multiple buckets/sources)



## How to use

```bash
# install dependencies
npm install

# setup necessary env variables (dotenv)
# FIREBASE_URL = webConfig.databaseURL
# FIREBASE_API_KEY = webConfig.apiKey
echo "FIREBASE_URL=ADD_FIREBASE_URL_HERE" > .env
echo "FIREBASE_API_KEY=ADD_FIREBASE_API_KEY_HERE" > .env

# make a build, watch and start a server
npm run dev

# make a minified (production) build
npm run build
```

Example of how to deploy, using surge (not included in dependencies).

```bash
surge ./build ongaku-ryoho-301253298.surge.sh
```

So, in short, to get a production build running, you follow these steps:

1. Setup a Firebase app
2. Setup Firebase rules (security): https://raw.githubusercontent.com/icidasset/ongaku-ryoho/master/config/firebase_security.json5
3. Enable Email & Password Authentication on Firebase
4. `FIREBASE_URL=... FIREBASE_API_KEY=... npm run build`
5. `surge ./build something-something.surge.sh`
