# Mod Clients - Render Deployment Guide

This guide will help you deploy your client management application to Render.

## Prerequisites

1. A GitHub account and repository
2. A Render account
3. AWS S3 bucket set up for client photo storage
4. PostgreSQL database (can be created in Render)

## Step 1: Push Your Code to GitHub

1. Create a new GitHub repository
2. Push your code to the repository:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/mod-clients.git
   git push -u origin main
   ```

## Step 2: Set Up PostgreSQL on Render

1. Log in to your Render dashboard
2. Go to "New" → "PostgreSQL"
3. Fill in the following details:
   - Name: mod-clients-db
   - Database: mod_clients
   - User: Choose a username
   - Region: Choose a region close to your users
4. Click "Create Database"
5. Save the Internal Database URL for later use

## Step 3: Create a Web Service on Render

1. Go to your Render dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Fill in the following details:
   - Name: mod-clients
   - Environment: Node
   - Region: Choose the same region as your database
   - Branch: main
   - Build Command: `cd render-deploy && npm install`
   - Start Command: `cd render-deploy && node server.js`
5. In the "Advanced" section, add the following environment variables:
   - DATABASE_URL: Your PostgreSQL URL from step 2
   - AWS_ACCESS_KEY_ID: Your AWS access key
   - AWS_SECRET_ACCESS_KEY: Your AWS secret key
   - AWS_REGION: Your AWS region (e.g., us-east-1)
   - S3_BUCKET_NAME: Your S3 bucket name
6. Click "Create Web Service"

## Step 4: Wait for Deployment

1. Render will automatically build and deploy your application
2. This process typically takes 1-2 minutes
3. Once completed, you can access your application at the provided URL

## Troubleshooting

If you encounter any issues:

1. Check the logs in the Render dashboard
2. Verify all environment variables are correctly set
3. Ensure your database connection is working by testing API endpoints
4. Check S3 permissions if client photos aren't uploading

## Next Steps

After successful deployment:

1. Test all functionality to ensure everything works in production
2. Set up a custom domain (optional)
3. Configure additional security settings as needed