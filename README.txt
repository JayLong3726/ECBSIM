ECB TRAINING SIMULATOR — NO-INSTALL WEB VERSION

WHAT THIS VERSION DOES
- ECB board runs in a normal browser.
- Board starts blank.
- ECO manually inserts tallies.
- Instructor scans a QR code on the board with a phone.
- Phone gets a separate instructor controller for that exact scenario.
- Instructor can change simulated air consumption live.
- Instructor can trigger DSU, ADSU, motion alarm, evacuation, telemetry loss/restoration and acknowledgement.
- Board and phone synchronise through Firebase Realtime Database.

IMPORTANT
This is a training simulator. It is not an operational replacement for the actual ECB or local procedures.
The air-consumption calculation is deliberately a configurable simulation model.

SETUP (ONE-TIME)
1. Create a Firebase project at https://console.firebase.google.com/
2. Add a Web App to the project.
3. In Firebase Authentication -> Sign-in method, enable Anonymous sign-in.
4. In Realtime Database, create a database.
5. Set the Realtime Database rules to the contents of firebase-rules.json.
6. Open firebase-config.js and paste the normal Web App configuration object from Firebase.
   Do NOT paste a service-account private key.
7. Upload the contents of this folder to GitHub Pages (or another static HTTPS host).
   No Node.js, npm or software installation is needed on the work computer.
8. Open the published index.html/website on the ECB computer.
9. Press Open ECB Board.
10. Scan the QR code with the instructor phone.

GITHUB PAGES
GitHub Pages can publish static HTML/CSS/JS directly from a repository.
Create a repository, upload these files, then enable Pages from Settings -> Pages.
The site will receive a public HTTPS URL.

SECURITY
The supplied rules allow authenticated anonymous users to access a session if they know its random session ID.
Use random session IDs and do not put sensitive personal information into the simulator.
For a more locked-down production version, the rules should be tightened further.

FIREBASE CDN
This project uses Firebase JavaScript SDK 12.16.0 directly from the Firebase CDN so the work computer does not need npm or Node.js.
