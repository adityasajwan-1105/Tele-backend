# Administrator Setup Guide

## Creating Admin Account

To create an admin account, run the following command:

```bash
cd backend
npm run create-admin
```

This will create an admin user with the following default credentials:

**Email:** `admin@telemed.com`  
**Password:** `Admin@123`

⚠️ **IMPORTANT:** Change the password after first login!

## Admin Features

### 1. Doctor Approval System
- Doctors must be approved by an admin before they can login
- Admin can view pending, approved, and rejected doctors
- Admin can approve or reject doctor registrations

### 2. Dashboard Statistics
- View total patients
- View total doctors
- View approved/pending/rejected doctor counts

### 3. Doctor Management
- **Pending Tab:** View and approve/reject new doctor registrations
- **Approved Tab:** View all approved doctors
- **Rejected Tab:** View rejected doctors with rejection reasons

## How It Works

### Doctor Registration Flow:
1. Doctor signs up with credentials
2. Account is created with `approvalStatus: 'pending'` and `isApproved: false`
3. Doctor cannot login until approved
4. Admin reviews doctor credentials in dashboard
5. Admin approves or rejects the doctor
6. If approved, doctor can now login
7. If rejected, doctor sees rejection reason

### Admin Login:
1. Admin logs in with credentials: `admin@telemed.com` / `Admin@123`
2. Admin is redirected to admin dashboard
3. Admin can manage doctor approvals

## API Endpoints

### Admin Routes (require admin authentication):
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/pending-doctors` - Get pending doctor registrations
- `GET /api/admin/approved-doctors` - Get approved doctors
- `GET /api/admin/rejected-doctors` - Get rejected doctors
- `POST /api/admin/approve-doctor/:doctorId` - Approve a doctor
- `POST /api/admin/reject-doctor/:doctorId` - Reject a doctor (requires reason)

## Security Notes

- Admin accounts cannot be created through the regular signup route
- Only existing admins can create new admin accounts (via script)
- All admin routes require JWT authentication with admin role
- Doctor login is blocked until admin approval

