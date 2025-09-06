-- Database schema for CTU E-Clinic
-- Create the Users table

CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    firstname NVARCHAR(50) NOT NULL,
    middlename NVARCHAR(50) NULL,
    lastname NVARCHAR(50) NOT NULL,
    ctuid NVARCHAR(20) NOT NULL UNIQUE,
    schoolyear NVARCHAR(20) NULL,
    course NVARCHAR(100) NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Optional: Create indexes for better performance on frequently queried columns
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_ctuid ON Users(ctuid);
CREATE INDEX idx_users_role ON Users(role);
