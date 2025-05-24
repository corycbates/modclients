# Deploying Your Client Management App to Render

This guide will walk you through the process of deploying your application to Render.

## Step 1: Create a GitHub Repository (Required)

Before deploying to Render, you need to push your code to GitHub:

1. Create a new repository on GitHub
2. Initialize Git in your Replit project:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

## Step 2: Create a PostgreSQL Database on Render

1. Log in to your Render dashboard at [render.com](https://render.com)
2. Click "New" and select "PostgreSQL"
3. Enter a name for your database (e.g., "client-management-db")
4. Choose the free plan or a paid plan based on your needs
5. Click "Create Database"
6. Once created, you'll see your database details including the **External Database URL**
7. Save this URL - you'll need it in the next step

## Step 3: Deploy Your Web Service

1. In your Render dashboard, click "New" and select "Web Service"
2. Connect your GitHub repository by authorizing GitHub access
3. Select your repository and branch (usually "main")
4. Configure your web service:
   - **Name**: client-management-app (or any name you prefer)
   - **Build Command**: `node production-build.js`
   - **Start Command**: `NODE_ENV=production node dist/server/index.js`
   - **Instance Type**: Free (or select according to your needs)

5. Add the following environment variables:
   - `NODE_ENV`: production
   - `PORT`: 10000
   - `DATABASE_URL`: (paste the PostgreSQL URL from step 2)
   - `AWS_ACCESS_KEY_ID`: (your AWS access key)
   - `AWS_SECRET_ACCESS_KEY`: (your AWS secret key)
   - `AWS_REGION`: (your AWS region, e.g., us-east-1)
   - `S3_BUCKET_NAME`: (your S3 bucket name)

6. Click "Create Web Service"

## Step 4: Monitor Deployment

1. Render will start building and deploying your application
2. You can view the build logs to monitor progress
3. Once deployment is complete, you'll see a URL where your application is hosted
4. Your application should be live in a few minutes!

## Troubleshooting

If you encounter any issues during deployment:

1. Check the build and runtime logs in your Render dashboard
2. Verify that all environment variables are set correctly
3. Make sure your database connection is working properly

## Redeploying

When you make changes to your application:

1. Push your changes to GitHub
2. Render will automatically detect the changes and redeploy your application

## Next Steps

After successful deployment:

1. Consider setting up a custom domain if you have one
2. Configure automatic database backups for your PostgreSQL database
3. Set up monitoring and alerts for your application

Congratulations! Your client management application is now deployed and accessible from anywhere.