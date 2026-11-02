# Shako Lake ML Research Lab — Frontend

React + Vite + Tailwind + React Router, talking to the FastAPI backend through
`src/services/api.js` (base URL from `VITE_API_URL`, see `.env`).

```
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Start the backend first (`cd ../backend && uvicorn main:app --reload`). See the
top-level README for the full setup.
