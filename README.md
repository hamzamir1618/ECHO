# ECHO – Student Societies Portal

ECHO is a full-stack web application built with **Node.js** and **React** that streamlines the management of student societies and university events. It automates tasks such as society registrations, event approvals, membership applications, and venue bookings, reducing manual paperwork and making campus activities more efficient and engaging.

---

## 🚀 Features
- 🔑 **Authentication & Role-based Dashboards**  
  Separate dashboards for students, societies, and administrators.  

- 📝 **Society & Event Management**  
  Register societies, apply for memberships, and manage event approvals digitally.  

- 📅 **Venue Bookings & Scheduling**  
  Book, modify, or cancel venues with admin approvals.  

- 💬 **Interactive Community**  
  Post announcements, comment, moderate content, and attach images/files.  

- 🔔 **Notifications & Reminders**  
  Get event reminders, membership updates, and role assignments.  

- 📊 **Attendance & History Tracking**  
  Keep records of society members and event participation.  

---

## 🛠 Tech Stack
- **Frontend:** React.js  
- **Backend:** Node.js + Express  
- **Database:** MongoDB (via Mongoose models)  
- **Authentication:** JWT / Session-based login  
- **Styling:** CSS  

---

## 📂 Project Structure
```

.
├── client/              # React frontend
│   ├── public/          # Static assets
│   └── src/             # React components & styles
│       └── components/  # Dashboards & UI components
├── models/              # Mongoose models (User, Society, etc.)
├── uploads/             # Uploaded images/files
├── server.js            # Express server entry point
├── package.json         # Backend dependencies
└── client/package.json  # Frontend dependencies

````

---

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/hamzamir1618/ECHO
   cd echo-web
   ```

2. **Install backend dependencies**

   ```bash
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start the backend server**

   ```bash
   npm run start
   ```

5. **Start the frontend (React)**

   ```bash
   cd client
   npm start
   ```

6. Open your browser at [http://localhost:3000](http://localhost:3000) 🎉

---

## 👨‍💻 Contributors

* **Hamza Ahmad Mir** (Developer)
* **Ataa Ur Rasool** (Developer)
* **Ahmed Murtaza Malik** (Scrum Master)

---
