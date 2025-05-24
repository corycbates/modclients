# Deploying Your Client Management App to Render

## Introduction
This guide provides simple instructions for deploying your client management application to Render using our standalone deployment package.

## Step 1: Create a PostgreSQL Database on Render

1. Log in to your Render dashboard at [render.com](https://render.com)
2. Click "New" and select "PostgreSQL"
3. Configure your database:
   - Name: `client-management-db` (or any name you prefer)
   - Database: `clientdb` (or any name you prefer)
   - User: Leave as default
   - Region: Choose the closest to your users
   - Instance Type: Free (or choose based on your needs)
4. Click "Create Database"
5. Once created, copy the "External Database URL" from the database information page

## Step 2: Deploy the Web Service

1. Download the `render-deploy` folder from this project
2. From your Render dashboard, click "New" and select "Web Service"
3. Select "Upload Files"
4. Upload the zip file of the `render-deploy` folder
5. Configure your web service:
   - Name: `client-management-app` (or any name you prefer)
   - Build Command: `chmod +x start.sh`
   - Start Command: `./start.sh`
   - Instance Type: Free (or choose based on your needs)

6. Add the following environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Paste the PostgreSQL URL you copied earlier
   - `AWS_ACCESS_KEY_ID`: Your AWS access key (if using S3 for image storage)
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key (if using S3 for image storage)
   - `AWS_REGION`: Your AWS region (e.g., `us-east-1`) (if using S3)
   - `S3_BUCKET_NAME`: Your S3 bucket name (if using S3)

7. Click "Create Web Service"

## Step 3: Monitor Deployment

1. Render will automatically start deploying your application
2. You can view the logs to monitor progress
3. Once deployment is complete, you'll see a URL where your application is hosted

## Step 4: Build and Upload the Client Application

For a complete solution, you'll need to build your React client application and upload it:

1. On your local machine, build the React client:
   ```
   npm run build
   ```
2. Create a `public` folder in your Render deploy directory
3. Upload the contents of the client's `dist` folder to the `public` folder on Render

## Database Management

If you need to manage your database directly:

1. Go to your PostgreSQL service in the Render dashboard
2. Click on the "Connect" tab
3. You can use the provided connection details with a PostgreSQL client, or use the "Shell" option to run SQL commands directly

## Troubleshooting

If you encounter issues during deployment:

1. Check the build and runtime logs for errors
2. Verify that all environment variables are set correctly
3. Ensure your database connection is working properly