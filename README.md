# ACHIEVERS CAT

A CAT-prep platform: daily practice, sectional & full mocks, materials,
Google login, and admin content management — built with Next.js, Firebase,
and Tailwind, ready to deploy on Vercel.

This version has been migrated from Supabase to Firebase. The existing UI
and routes are preserved; the Firebase layer replaces Supabase Auth and
provides Firestore/Storage utilities and security rules for the next phase
of wiring real mock data.

## Firebase setup

1. Create a project in the Firebase Console.
2. Enable **Authentication → Sign-in method → Google**.
3. Add a **Web app** under Project settings and copy its configuration into
   `.env.local` using `.env.example` as the template.
4. Create a **Cloud Firestore** database.
5. Create a **Storage** bucket.
6. Deploy the rules in `firebase/firestore.rules` and
   `firebase/storage.rules`.
7. Add `localhost` and your Vercel domain to
   **Authentication → Settings → Authorized domains**.

### Making yourself an admin

After your first Google login, a document is created at:

```text
profiles/{your-firebase-user-uid}
```

Add this field in Firestore:

```text
role: admin
```

Do not allow students to set their own role. The rules only allow a user to
create/update their own profile fields; for production, enforce role changes
through a trusted admin process.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the Firebase Web App values.
These `NEXT_PUBLIC_FIREBASE_*` values are normal Firebase browser
configuration values; Firebase Security Rules are what protect the data.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import it into Vercel.
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables.
4. Deploy.
5. Add the final Vercel domain to Firebase Authentication's authorized
   domains.

## Project structure

```text
src/app/               Pages (Next.js App Router)
src/components/        Header, Footer, MockCard, SectionalTabs, Logo
src/lib/firebase/       Firebase app, Auth and Firestore client helpers
firebase/firestore.rules
                         Firestore security rules
firebase/storage.rules  Firebase Storage security rules
```

## Important production note

The current scaffold still contains placeholder mock/question/result data.
The next implementation phase should connect the admin CRUD screens and
mock engine to Firestore. For secure scoring, never send `isCorrect` to the
browser before submission. Use a trusted server environment (Firebase
Admin SDK in a Vercel Route Handler/Function or Cloud Function) to grade
answers and write the result.

For materials, upload files to Firebase Storage and keep metadata in the
`materials` Firestore collection.
