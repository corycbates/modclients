# Deploying Your Client Management App to Render

## Step 1: Create a Render Account
If you haven't already, sign up for a free account at [render.com](https://render.com).

## Step 2: Create a PostgreSQL Database

1. From your Render dashboard, click "New" and select "PostgreSQL"
2. Configure your database:
   - Name: `client-management-db` (or any name you prefer)
   - Database: `clientdb` (or any name you prefer)
   - User: Leave as default
   - Region: Choose the closest to your users
   - Instance Type: Free (or choose based on your needs)
3. Click "Create Database"
4. Once created, copy the "External Database URL" from the database information page

## Step 3: Set Up Your Web Service

1. From your Render dashboard, click "New" and select "Web Service"
2. Choose "Deploy from a Git repository" if you have one, or "Upload" if you're uploading directly
3. Configure your web service:
   - Name: `client-management-app` (or any name you prefer)
   - Build Command: `./render-build.sh`
   - Start Command: `cd dist && node server/index.js`
   - Instance Type: Free (or choose based on your needs)

4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Paste the PostgreSQL URL you copied earlier
   - `AWS_ACCESS_KEY_ID`: Your AWS access key (if using S3 for image storage)
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key (if using S3 for image storage)
   - `AWS_REGION`: Your AWS region (e.g., `us-east-1`) (if using S3)
   - `S3_BUCKET_NAME`: Your S3 bucket name (if using S3)

5. Click "Create Web Service"

## Step 4: Monitor Your Deployment

1. Render will automatically start building and deploying your application
2. You can view the build logs to monitor progress
3. Once deployment is complete, you'll see a URL where your application is hosted (typically something like `https://client-management-app.onrender.com`)

## Troubleshooting

If you encounter issues during deployment:

1. Check the build logs for errors
2. Verify that all environment variables are set correctly
3. If you see errors about missing modules, make sure your `render-build.sh` script is executable

## Important Notes

- The first deployment might take a few minutes to complete
- The free tier of Render will spin down your service after periods of inactivity, which may cause a slight delay when accessing it after it's been idle
- For production use, consider upgrading to a paid plan to avoid spin-down and get better performance

## Database Management

If you need to access your database directly:

1. Go to your PostgreSQL service in the Render dashboard
2. Click on the "Connect" tab
3. You can use the provided connection details with a PostgreSQL client, or use the "Shell" option to run SQL commands directly