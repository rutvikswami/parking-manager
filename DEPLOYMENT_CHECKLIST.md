# 🚀 Deployment Checklist

## ✅ Pre-Deployment Steps Completed

- [x] All TypeScript errors fixed
- [x] Build compiles successfully
- [x] Console logs removed
- [x] Dead code removed (150+ lines)
- [x] Schema alignment verified
- [x] Security check passed (.env protected)
- [x] Bundle optimized (180.76 kB gzipped)

---

## 🔧 Database Setup (REQUIRED)

**⚠️ CRITICAL: Must be done before deploying!**

### Update SQL Function

1. **Navigate to Supabase SQL Editor:**
   - URL: https://kriguklkrizahebsuieo.supabase.co/project/_/sql/new

2. **Copy and run this SQL:**

```sql
-- Drop existing function first (required when changing parameter names)
DROP FUNCTION IF EXISTS process_owner_application(uuid, boolean, text);

CREATE OR REPLACE FUNCTION process_owner_application(
    p_application_id UUID,
    p_approve BOOLEAN,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    applicant_user_id UUID;
    reviewer_id UUID;
BEGIN
    reviewer_id := auth.uid();

    -- Check if reviewer is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = reviewer_id AND user_role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only super admins can process applications';
    END IF;

    -- Get application details
    SELECT user_id INTO applicant_user_id
    FROM owner_applications
    WHERE id = p_application_id AND status = 'pending';

    IF applicant_user_id IS NULL THEN
        RAISE EXCEPTION 'Application not found or already processed';
    END IF;

    -- Update application status
    UPDATE owner_applications
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
        reviewed_by = reviewer_id,
        reviewed_at = NOW(),
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_application_id;

    -- Upgrade user role if approved
    IF p_approve THEN
        UPDATE profiles
        SET user_role = 'location_owner', 
            updated_at = NOW()
        WHERE id = applicant_user_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Click "RUN"** to execute

4. **Verify success:** Should see "Success. No rows returned"

---

## 🔐 Environment Variables Setup

### For Development

1. **Copy template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials in `.env`:**
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_MAPTILER_API_KEY=your_maptiler_key
   ```

### For Production (Netlify/Vercel)

Add these environment variables in your hosting dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPTILER_API_KEY`

---

## 📦 Build & Deploy

### Local Testing

```bash
cd smart-park-log-detector-v1
npm install
npm run dev
```

Open: http://localhost:5174

### Production Build

```bash
npm run build
```

This creates optimized files in `dist/` folder.

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

## 🧪 Post-Deployment Testing

### Test Checklist

- [ ] **Homepage loads** correctly
- [ ] **Login/Register** works
- [ ] **User Dashboard** displays
- [ ] **Create Location** with coordinates
- [ ] **Add Zone** with lat/lng
- [ ] **View zones** on map
- [ ] **Super Admin Dashboard** accessible
- [ ] **Manage Owners** tab shows owners
- [ ] **Delete owner** works with cascade
- [ ] **Requests tab** shows only pending
- [ ] **Approve request** works without errors
- [ ] **Reject request** works

### Test Accounts Needed

1. **Regular User**
   - Can view parking spots
   - Can apply for owner status

2. **Location Owner**
   - Can create locations
   - Can add/edit/delete zones
   - Can manage their properties

3. **Super Admin**
   - Can do everything
   - Can manage all owners
   - Can approve/reject applications

---

## 🔍 Troubleshooting

### Issue: "Column reference admin_notes is ambiguous"
**Solution:** Run the SQL function update (see Database Setup above)

### Issue: "Failed to add zone"
**Solution:** Ensure lat/lng coordinates are filled in the zone form

### Issue: Environment variables not working
**Solution:** 
- Restart dev server after changing `.env`
- For production, verify env vars in hosting dashboard
- Check that variable names start with `VITE_`

### Issue: Build warnings about chunk size
**Solution:** This is expected. The warning appears because the bundle is >500KB. It's optimized and works fine.

---

## 📊 Performance Metrics

### Bundle Size (Production)
- **CSS:** 30.61 kB (gzip: 5.97 kB)
- **JS:** 602.75 kB (gzip: 180.76 kB)
- **Total:** ~633 kB (gzip: ~187 kB)

### Load Time Expectations
- First Load: ~2-3 seconds
- Subsequent Loads: <1 second (cached)

---

## 🔒 Security Notes

### Protected Files (Never Commit)
- `.env` - Contains API keys
- `node_modules/` - Dependencies
- `dist/` - Build output

### Public Files (Safe to Commit)
- `.env.example` - Template without secrets
- `src/` - Source code
- `public/` - Static assets

### API Key Security
- Supabase Anon Key: Safe for client-side (RLS protected)
- MapTiler API Key: Safe for client-side (domain restricted)

---

## 📝 Version History

### v1.0.0 (2026-01-20)
- Initial production-ready release
- Super Admin owner management
- Fixed zone creation bugs
- Optimized codebase
- Removed 150+ lines of dead code
- All console.logs cleaned

---

## 🆘 Support

### Documentation
- `README.md` - Project overview
- `CHANGELOG.md` - Complete change history
- `DEPLOYMENT_CHECKLIST.md` - This file

### Database Schema
- `src/lib/database.sql` - Complete schema with comments

### Need Help?
- Check the CHANGELOG.md for known issues
- Verify all environment variables are set
- Ensure SQL function was updated in Supabase
