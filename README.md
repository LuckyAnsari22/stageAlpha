# StageAlpha

StageAlpha is a professional-grade logistics operations platform and revenue-optimization framework designed to manage event equipment rental lifecycles iteratively and securely. Constructed directly onto an atomic, transactionally normalized 3NF PostgreSQL architecture, it cleanly shields logic inside deeply coupled procedural functions allowing raw application logic to remain separated perfectly.

Its flagship feature is the Pricing Engine Simulator, utilizing a custom-built mathematical implementation of the Lerner Index. Drawing from price elasticity estimates obtained dynamically from OLS historical recalculations against baseline stock counts and deterministic seasonality heuristics, the system maximizes potential yield across all reservations autonomously.

## Live Demo
[https://your-railway-app-url.up.railway.app](https://your-railway-app-url.up.railway.app) *(Update when deployed)*

## Tech Stack
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![AngularJS](https://img.shields.io/badge/AngularJS-E23237?style=for-the-badge&logo=angularjs&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

## Quick Start
```bash
git clone <repository-url>
cd stageAlpha
npm install
cp .env.example .env 
# (Fill in your local environment credentials in .env)
npm run db:init
npm run db:seed
npm start
```

## Algorithm Performance
The pricing engine was backtested against 6 months of historical data. 
Algorithm would have generated **₹XX,XXX** more revenue (**+X%**) compared to flat pricing. 
*(These metrics should be accurately extracted during the first synchronous 'Run Backtest' log execution!)*

---
**Course Documentation**
NMIMS MPSTME | AY 2025-26  
WP: 702AI0C028 + DBMS: 702A10C027
