# 📺 AmirneTV

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**AmirneTV** is an interactive, real-time vocabulary learning and multiplayer battle platform designed to gamify preparation for the Israeli Psychometric and Amirnet English exams. Whether you are passively absorbing vocabulary while watching TV or actively competing against peers in a high-speed arena, AmirneTV transforms exam prep into an engaging, data-driven experience.

---

## ✨ Core Features

*   ⏱️ **TV Companion Mode:** A real-time episode stopwatch synchronized with live word capture. Users can input words via fast typing or speech-to-text transcription while watching their favorite shows.
*   🧠 **Intelligent Vocabulary Engine:** 
    *   Automatically cross-references inputs against a built-in high-frequency Psychometric/Amirnet database.
    *   Utilizes dynamic scoring (1–100 scale) to evaluate word difficulty.
    *   Provides instant, contextual Hebrew translations.
*   ⚔️ **Real-Time Multiplayer Battle Arena:** A live quiz room supporting up to 10 simultaneous players.
*   🔐 **User Management & Architecture:** Robust state handling, user authentication, and real-time match lifecycle routing.

---

## 🎮 Multiplayer Game Rules & Flow

The Battle Arena is designed for rapid recall and high-pressure performance:

1.  **Lobby & Matchmaking:** Up to 10 players join a synchronized live room.
2.  **Rapid-Fire Rounds:** The game serves 10 consecutive multiple-choice questions (one target English word, four Hebrew translation options).
3.  **Speed Scoring:** Points are awarded exclusively to the *fastest* player to select the correct answer. 
4.  **Live State:** The UI updates in real-time for all connected clients.
5.  **Victory Screen:** A real-time leaderboard is displayed at the end of the match, crowning the arena champion.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend / UI** | React & JavaScript | Dynamic, component-based user interface designed for seamless real-time interactions. |
| **Backend & Database** | Supabase | Handles PostgreSQL database, user authentication, and real-time subscriptions for the multiplayer arena. |
| **Deployment** | Vercel | Fast, scalable hosting with continuous integration/continuous deployment (CI/CD). |
| **AI & APIs** | LLM & Speech-to-Text | API integrations for dynamic word scoring and voice input transcription. |

---

## 🚀 Installation & Local Setup

Follow these steps to run AmirneTV on your local machine:

**1. Clone the repository:**
```bash
git clone [https://github.com/yourusername/AmirneTV.git](https://github.com/yourusername/AmirneTV.git)
cd AmirneTV
