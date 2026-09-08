from setuptools import setup, find_packages  # type: ignore

setup(
    name="flex_back",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "motor",
        "groq",
        "sendgrid",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "python-multipart",
        "python-dotenv"
    ],
    python_requires=">=3.8",
)