# Flex Living Reviews Dashboard - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Interface Overview](#user-interface-overview)
3. [Authentication](#authentication)
4. [Property Management](#property-management)
5. [Review Management](#review-management)
6. [AI-Powered Insights](#ai-powered-insights)
7. [Dashboard Analytics](#dashboard-analytics)
8. [Public Review Embedding](#public-review-embedding)
9. [Integration Management](#integration-management)
10. [Settings and Configuration](#settings-and-configuration)

## Getting Started

### First Login

1. **Access the Application**
   - Navigate to your Flex Living Reviews Dashboard URL
   - If you have credentials, proceed to login
   - If this is a new account, click "Register" to create one

2. **Account Registration**
   - Click "Register" on the login page
   - Fill in your details:
     - Full Name
     - Email Address
     - Phone Number (optional)
     - Company Name (optional)
     - Password (must be 8+ characters with uppercase, lowercase, digit, and special character)
     - Role (Admin, Manager, or Viewer)

3. **Password Reset**
   - If you forget your password, click "Forgot Password"
   - Enter your email address
   - Check your email for a password reset link
   - Follow the instructions to create a new password

### Dashboard Access

Once logged in, you'll see the main dashboard with:
- **Navigation Menu** (left sidebar)
- **Main Content Area** (dashboard overview)
- **Quick Actions** (top toolbar)

## User Interface Overview

### Navigation Menu

The left sidebar provides access to:

- **Dashboard** - Overview of all reviews and key metrics
- **Reviews** - Manage and review customer feedback
- **Properties** - Manage property listings and details
- **Analytics** - Detailed insights and AI-powered analysis
- **Integrations** - Connect external review platforms
- **Settings** - Account and system configuration

### Dashboard Components

- **Stats Cards** - Quick overview metrics
- **Recent Reviews** - Latest customer feedback
- **Sentiment Analysis** - AI-powered sentiment tracking
- **Top Properties** - Best and worst performing properties
- **Quick Actions** - Common tasks like adding reviews or managing properties

## Authentication

### Login Process

1. **Enter Credentials**
   - Email and password
   - System supports JWT-based authentication
   - Sessions expire after 30 minutes of inactivity

2. **Role-Based Access**
   - **Admin**: Full access to all features
   - **Manager**: Can manage properties, reviews, and view analytics
   - **Viewer**: Read-only access to reviews and analytics

3. **Session Management**
   - Your session is maintained securely
   - Auto-logout after 30 minutes of inactivity
   - You can manually logout at any time

### Account Management

- **Profile Settings** - Update personal information
- **Password Management** - Change your password
- **Email Preferences** - Configure notification settings

## Property Management

### Adding Properties

1. **Navigate to Properties**
   - Click "Properties" in the sidebar
   - Click "Add Property"

2. **Property Information**
   - Property Name (required)
   - Full Address (required)
   - Property Type (Apartment, House, Hotel, etc.)
   - Location Details (City, State, Country, ZIP code)
   - Coordinates (Latitude/Longitude for mapping)

3. **Integration Setup**
   - Connect to external platforms:
     - Hostaway Property ID
     - Airbnb Property ID
     - Google Places integration

### Managing Properties

- **Edit Properties** - Update property details
- **View Reviews** - See all reviews for a specific property
- **Property Status** - Activate/deactivate properties
- **Bulk Operations** - Manage multiple properties at once

### Property Details

Each property shows:
- Basic information and location
- Review statistics (total, average rating, sentiment)
- Recent reviews and responses
- Integration status with external platforms

## Review Management

### Viewing Reviews

- **Review List** - Paginated list of all reviews
- **Filtering Options**:
  - By property
  - By source (Google, Airbnb, etc.)
  - By sentiment (positive, negative, neutral)
  - By rating (1-5 stars)
  - By status (pending, approved, rejected)

### AI-Powered Review Processing

When reviews are submitted or imported:

1. **Automatic Sentiment Analysis**
   - AI analyzes the review text
   - Assigns sentiment score (-1 to 1)
   - Categorizes as positive, negative, or neutral
   - Extracts key topics and themes

2. **Language Detection**
   - Automatically detects review language
   - Can auto-translate non-English reviews
   - Stores both original and translated text

3. **Topic Extraction**
   - AI identifies main themes in reviews
   - Categorizes feedback into topics
   - Helps with quick issue identification

### Review Moderation

1. **Approval Process**
   - Review all new reviews
   - Check for inappropriate content
   - Approve legitimate reviews
   - Reject spam or fake reviews

2. **Bulk Actions**
   - Select multiple reviews
   - Bulk approve or reject
   - Assign reviews to team members

3. **Review Responses**
   - Respond to customer reviews
   - Public or private responses
   - Track response status

### Manual Review Entry

1. **Add Manual Reviews**
   - Click "Add Review"
   - Enter customer details
   - Add rating and review text
   - Select source as "direct"

2. **Import Reviews**
   - Connect external platforms
   - Automatic import of new reviews
   - Scheduled or manual sync

## AI-Powered Insights

### Sentiment Analysis

- **Real-time Analysis** - Every review is automatically analyzed
- **Sentiment Trends** - Track sentiment changes over time
- **Detailed Breakdown** - See specific emotional themes

### Topic Analysis

- **Automatic Tagging** - Reviews are tagged with relevant topics
- **Trending Issues** - Identify common themes across reviews
- **Improvement Areas** - Find specific aspects needing attention

### Predictive Analytics

- **Review Forecasting** - Predict future review trends
- **Performance Tracking** - Monitor property performance
- **Competitive Analysis** - Compare against market standards

## Dashboard Analytics

### Key Metrics

- **Total Reviews** - Count of all reviews
- **Average Rating** - Overall property performance
- **Sentiment Distribution** - Breakdown of positive/negative/neutral
- **Review Sources** - Performance across platforms

### Visual Analytics

- **Sentiment Trends** - Charts showing sentiment over time
- **Rating Distributions** - Star rating breakdowns
- **Topic Clouds** - Visual representation of common themes
- **Performance Heatmaps** - Property performance comparison

### Reports

- **Weekly/Monthly Reports** - Regular performance summaries
- **Custom Reports** - Build custom analytics
- **Export Data** - Download data in various formats
- **Scheduled Reports** - Automatic report delivery

## Public Review Embedding

### Embedding Reviews on Websites

1. **Generate Embed Code**
   - Navigate to the property you want to embed
   - Click "Get Embed Code"
   - Copy the provided HTML/JavaScript code

2. **Customize Appearance**
   - Choose display style (grid, list, carousel)
   - Select review count to show
   - Filter by minimum rating
   - Customize colors and styling

3. **Implementation**
   ```html
   <!-- Example embed code -->
   <div id="flex-living-reviews" data-property-id="your-property-id"></div>
   <script src="https://your-domain.com/embed.js"></script>
   ```

### Public Review Widget

- **Responsive Design** - Works on all devices
- **Customizable Themes** - Match your website design
- **SEO Friendly** - Search engine optimized
- **Real-time Updates** - Automatically updates with new reviews

### Widget Configuration

- **Review Count** - Number of reviews to display
- **Rating Filter** - Minimum rating threshold
- **Sorting Options** - Newest, highest rated, most helpful
- **Display Options** - Show/hide ratings, review text, reviewer names

## Integration Management

### Supported Platforms

- **Google Reviews** - Automatic sync from Google My Business
- **Airbnb** - Import guest reviews
- **Booking.com** - Hotel review integration
- **Hostaway** - Property management platform
- **TripAdvisor** - Travel review integration
- **Yelp** - Business review platform

### Setting Up Integrations

1. **Enable Platform**
   - Go to Integrations settings
   - Select the platform to enable
   - Follow authentication steps

2. **Configure Mapping**
   - Map your internal properties to external IDs
   - Set up automatic review import
   - Configure approval settings

3. **Sync Settings**
   - Choose sync frequency (real-time, hourly, daily)
   - Set up automatic approval rules
   - Configure review filtering

### Managing Integrations

- **Sync Status** - Monitor integration health
- **Error Handling** - View and resolve sync issues
- **Manual Sync** - Force sync when needed
- **Integration Logs** - Track all sync activities

## Settings and Configuration

### Account Settings

- **Profile Management**
  - Update personal information
  - Change password
  - Manage email preferences

- **Notification Settings**
  - Email alerts for new reviews
  - Dashboard notifications
  - Report delivery preferences

### System Configuration

- **AI Service Settings**
  - Configure Gemini AI parameters
  - Set sentiment analysis thresholds
  - Manage translation settings

- **Email Configuration**
  - SendGrid integration setup
  - Email templates
  - SMTP settings for notifications

### User Management

- **Add/Remove Users**
  - Invite new team members
  - Assign roles and permissions
  - Manage user status

- **Permission Matrix**
  - Admin: Full system access
  - Manager: Property and review management
  - Viewer: Read-only access

### Data Management

- **Export Options**
  - Download review data
  - Export analytics reports
  - Backup configuration

- **Data Retention**
  - Configure data retention policies
  - Archive old reviews
  - Manage storage limits

## Best Practices

### Review Management

1. **Prompt Responses** - Reply to reviews within 24-48 hours
2. **Professional Tone** - Maintain courteous and helpful responses
3. **Address Issues** - Acknowledge problems and offer solutions
4. **Thank Positive Reviews** - Show appreciation for positive feedback

### Property Management

1. **Complete Information** - Ensure all property details are accurate
2. **Regular Updates** - Keep property information current
3. **Photo Management** - Maintain high-quality property photos
4. **External Links** - Keep all integration links working

### Analytics Utilization

1. **Regular Monitoring** - Check dashboard weekly
2. **Trend Analysis** - Look for patterns in sentiment
3. **Action Items** - Create tasks based on insights
4. **Team Sharing** - Share important findings with your team

### Security Guidelines

1. **Password Security** - Use strong, unique passwords
2. **Session Management** - Log out when finished
3. **Data Handling** - Treat customer data with care
4. **Access Control** - Only share access with authorized personnel

## Troubleshooting

### Common Issues

**Login Problems**
- Clear browser cache and cookies
- Check email address and password
- Try password reset if needed

**Integration Failures**
- Verify API credentials are correct
- Check internet connection
- Contact support for API issues

**Review Sync Issues**
- Check integration status in settings
- Verify property mapping is correct
- Try manual sync

**Performance Issues**
- Check internet connection
- Clear browser cache
- Try different browser

### Getting Help

1. **Documentation** - Check this user guide first
2. **System Status** - Verify no system maintenance
3. **Contact Support** - Use support channels for technical issues
4. **Community Forum** - Connect with other users

## FAQ

**Q: How often are reviews automatically synchronized?**
A: Reviews are typically synchronized every hour, but this can be configured in your integration settings.

**Q: Can I import historical reviews?**
A: Yes, most integrations allow importing reviews from the past 6-12 months.

**Q: Is the AI analysis always accurate?**
A: AI provides highly accurate analysis, but human review is still recommended for important decisions.

**Q: Can I customize the sentiment analysis?**
A: Yes, you can adjust sensitivity thresholds and custom categories in the settings.

**Q: How do I embed reviews on my website?**
A: Generate embed code from the property details page and paste it into your website HTML.

**Q: Can multiple users manage the same property?**
A: Yes, properties can have multiple managers assigned with appropriate permissions.

**Q: What happens to reviews when I delete a property?**
A: Reviews are archived rather than deleted to preserve data integrity.

**Q: How secure is my data?**
A: All data is encrypted in transit and at rest, and we follow industry-standard security practices.

---

For additional support or questions not covered in this guide, please contact our support team or consult the technical documentation.