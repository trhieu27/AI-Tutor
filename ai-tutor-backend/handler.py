from mangum import Mangum
from main import app

# This is the entry point for AWS Lambda + API Gateway / Function URL
# Configure your Lambda Handler as: handler.handler
handler = Mangum(app, lifespan="off")
