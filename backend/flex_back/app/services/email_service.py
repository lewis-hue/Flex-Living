from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from ..core.config import get_settings

settings = get_settings()

class EmailService:
    def __init__(self):
        self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME

    async def send_test_email(self):
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=settings.TEST_EMAIL,
                subject='Flex Living - Email Service Test',
                plain_text_content='This is a test email to verify SendGrid integration.'
            )
            response = self.client.send(message)
            if response.status_code == 202:
                print("✅ SendGrid email test successful")
                return True
            else:
                print(f"❌ SendGrid test failed with status code: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ SendGrid test failed: {e}")
            return False

email_service = EmailService()