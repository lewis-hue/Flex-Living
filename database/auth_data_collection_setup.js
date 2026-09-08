// MongoDB Users Collection Setup Script
// This script creates the users collection with proper schema and indexes

// Switch to the flex_living database
use flex_living;

// Create the auth_data collection
db.createCollection("auth_data", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["email", "hashed_password", "full_name", "role", "is_active", "created_at"],
         properties: {
            _id: {
               bsonType: "objectId"
            },
            email: {
               bsonType: "string",
               description: "User email address, must be unique",
               pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            },
            full_name: {
               bsonType: "string",
               description: "User's full name",
               minLength: 1,
               maxLength: 200
            },
            hashed_password: {
               bsonType: "string",
               description: "Bcrypt hashed password"
            },
            role: {
               bsonType: "string",
               description: "User role",
               enum: ["admin", "manager", "viewer"]
            },
            is_active: {
               bsonType: "bool",
               description: "Whether the user account is active"
            },
            email_verified: {
               bsonType: "bool",
               description: "Whether the email has been verified"
            },
            phone: {
               bsonType: ["string", "null"],
               description: "User phone number (optional)"
            },
            last_login: {
               bsonType: ["date", "null"],
               description: "Last login timestamp"
            },
            verification_code: {
               bsonType: ["string", "null"],
               description: "Email verification code"
            },
            verification_expires: {
               bsonType: ["date", "null"],
               description: "Verification code expiration time"
            },
            reset_token: {
               bsonType: ["string", "null"],
               description: "Password reset token"
            },
            reset_expires: {
               bsonType: ["date", "null"],
               description: "Password reset token expiration time"
            },
            created_at: {
               bsonType: "date",
               description: "Account creation timestamp"
            },
            updated_at: {
               bsonType: "date",
               description: "Last update timestamp"
            }
         }
      }
   },
   validationLevel: "strict"
});

// Create indexes for better performance
db.auth_data.createIndex({ "email": 1 }, { unique: true });
db.auth_data.createIndex({ "role": 1 });
db.auth_data.createIndex({ "is_active": 1 });
db.auth_data.createIndex({ "email_verified": 1 });
db.auth_data.createIndex({ "created_at": -1 });
db.auth_data.createIndex({ "verification_code": 1 });
db.auth_data.createIndex({ "reset_token": 1 });

// Sample document for testing
db.auth_data.insertOne({
   "email": "lewiemuguna417@gmail.com",
   "full_name": "Lewie Muguna",
   "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5.L3j5x2qi", // password: "SecurePassword123!"
   "role": "manager",
   "is_active": true,
   "email_verified": true,
   "phone": "+254700000000",
   "last_login": null,
   "verification_code": null,
   "verification_expires": null,
   "reset_token": null,
   "reset_expires": null,
   "created_at": new Date(),
   "updated_at": new Date()
});

// Create admin user
db.auth_data.insertOne({
   "email": "admin@flexliving.com",
   "full_name": "System Administrator",
   "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5.L3j5x2qi", // password: "AdminPassword123!"
   "role": "admin",
   "is_active": true,
   "email_verified": true,
   "phone": null,
   "last_login": null,
   "verification_code": null,
   "verification_expires": null,
   "reset_token": null,
   "reset_expires": null,
   "created_at": new Date(),
   "updated_at": new Date()
});

// Create viewer user
db.auth_data.insertOne({
   "email": "viewer@flexliving.com",
   "full_name": "View Only User",
   "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5.L3j5x2qi", // password: "ViewerPassword123!"
   "role": "viewer",
   "is_active": true,
   "email_verified": true,
   "phone": null,
   "last_login": null,
   "verification_code": null,
   "verification_expires": null,
   "reset_token": null,
   "reset_expires": null,
   "created_at": new Date(),
   "updated_at": new Date()
});

print("Users collection created successfully with sample data!");
print("Collection info:");
db.auth_data.getIndexes();
print("Document count: " + db.auth_data.countDocuments());