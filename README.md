# Tilt Project

## Structure
The repository has the following structure:

- **[Backend/](Backend/)** — backend server
  - **[firebase/](Backend/firebase/)** — Firebase setup and admin SDK
  - **[routers/](Backend/routers/)** — FastAPI routers (incl. Stripe endpoints)
- **[public/](public/)** — static assets
- **[src/](src/)** — frontend and game components

---

## Environment Variables

Stripe functionality (deposits/withdrawals) requires local environment files.
`.gitignore` excludes `.env` files, so create them locally:

**Root `.env` (server):**
```dotenv
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```
## **Build Scripts**

### **Frontend localhost**

cd to COMP602-Tilt> 
  ```npm run dev ```
  
### **Backend server**

cd to COMP602-Tilt> 
```pip install requirements.txt```
cd to COMP602-Tilt> 
```py -m uvicorn Backend.main:app --reload --port 4000```


### **Stripe listener**
After running backend server, note: .env file must be created

```stripe listen --forward-to localhost:4000/payments/webhook ```

## **Included Packages**

**Python packages (requirements.txt)**
fastapi==0.116.1

uvicorn==0.35.0

firebase-admin==7.1.0

google-cloud-firestore==2.21.0

pydantic==2.11.7

---

**Typescript packages (package.json)**

Dependencies

@emotion/react — ^11.14.0

@emotion/styled — ^11.14.1

@mui/icons-material — ^7.3.1

@mui/material — ^7.3.1

@stripe/stripe-js — ^7.9.0

@toolpad/core — ^0.16.0

firebase — ^12.1.0

react — ^19.1.0

react-dom — ^19.1.0

react-router-dom — ^7.8.2

react-slick — ^0.31.0

slick-carousel — ^1.8.1

Dev Dependencies

@eslint/js — ^9.30.1

@types/react — ^19.1.8

@types/react-dom — ^19.1.6

@types/react-slick — ^0.23.13

@vitejs/plugin-react — ^4.6.0

eslint — ^9.30.1

eslint-plugin-react-hooks — ^5.2.0

eslint-plugin-react-refresh — ^0.4.20

globals — ^16.3.0

typescript — ~5.8.3

typescript-eslint — ^8.35.1

vite — ^7.0.4

