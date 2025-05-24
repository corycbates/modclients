# Deploying Your Client Management App to Render

This guide will walk you through the process of deploying your application to Render.

## Prerequisites

1. A Render account (sign up at [render.com](https://render.com) if you don't have one)
2. Your AWS credentials for S3 storage:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION
   - S3_BUCKET_NAME

## Deployment Steps

### Step 1: Create a PostgreSQL Database on Render

1. Log in to your Render dashboard
2. Click "New" and select "PostgreSQL"
3. Configure your database:
   - Name: `client-management-db` (or any name you prefer)
   - Database: `client_management` (or any name you prefer)
   - User: Leave as default
   - Region: Choose the closest to your users
   - Instance Type: Select based on your needs (Free tier is fine for testing)
4. Click "Create Database"
5. Once created, find and copy your "External Database URL" - you'll need this for the next step

### Step 2: Deploy Your Web Service

1. From your Render dashboard, click "New" and select "Web Service"
2. Connect to your GitHub repository or upload your application
3. Configure your web service:
   - Name: `client-management-app` (or any name you prefer)
   - Region: Choose the same region as your database
   - Runtime: Node
   - Build Command: `./build.sh`
   - Start Command: `NODE_ENV=production node dist/server/index.js`
   - Instance Type: Select based on your needs

4. Add Environment Variables:
   - `DATABASE_URL` = [your PostgreSQL External URL from Step 1]
   - `AWS_ACCESS_KEY_ID` = [your AWS access key]
   - `AWS_SECRET_ACCESS_KEY` = [your AWS secret key]
   - `AWS_REGION` = [your AWS region, e.g., us-east-1]
   - `S3_BUCKET_NAME` = [your S3 bucket name]
   - `NODE_ENV` = production

5. Click "Create Web Service"

### Step 3: Database Migration

When your service first deploys, it will automatically create the database tables based on your Drizzle schema. However, you might want to verify that your database has been correctly set up:

1. From your Render dashboard, click on your PostgreSQL service
2. Select "Shell" tab
3. Connect to your database with:
   ```
   psql
   ```
4. View your tables with:
   ```
   \dt
   ```

You should see your `clients` and `visits` tables listed.

### Step 4: Verify Deployment

After deployment completes:

1. Click the URL provided by Render to view your application
2. Verify that you can:
   - View the dashboard
   - Create/edit clients
   - Upload client photos
   - Add/edit visit records

### Troubleshooting

If you encounter issues:

1. Check Render logs by clicking on your web service and reviewing the logs
2. Make sure all environment variables are set correctly
3. Verify that your database connection is working

## Updating Your Application

When you want to update your application:

1. Push changes to your GitHub repository
2. Render will automatically detect changes and redeploy your application

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render PostgreSQL Guide](https://render.com/docs/databases)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)