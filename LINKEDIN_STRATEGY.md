# StageAlpha Post-Development Networking Strategy

The following individuals should be followed on LinkedIn to track emerging trends in revenue management and dynamic pricing, explicitly aligning with StageAlpha's operational scope:
1. **Ravi Mehta** (Ex-Robinhood, Twitch PM) — Insights on pricing psychology.
2. **Lenny Rachitsky** — Deep product management frameworks concerning pricing strategy.
3. **Patrick Campbell** (Founder, ProfitWell) — Empirical pricing data trends.
4. **Kyle Poyar** (OpenView Partners) — SaaS pricing infrastructure and limits.

---

### LinkedIn Templates for Project Deployment & Marketing

**Post 1: The Build Post (Launch Sequence)**  
*Instructed for execution upon successful backtesting and final deployment.*

> Built something I'm genuinely proud of during Sem IV.
> 
> StageAlpha: a quantitative revenue optimization engine for event equipment rental.
> 
> The core: not just a booking platform.
> 
> I implemented OLS price elasticity estimation directly in PostgreSQL using `REGR_SLOPE(ln(demand), ln(price))` — the same log-log regression approach used in academic pricing literature. The Lerner formula $P^* = |\varepsilon|/(|\varepsilon|-1) \times MC$ then finds the revenue-maximizing price.
> 
> The backtest module ran the algorithm on 6 months of historical data. Result: [X]% projected revenue improvement.
> 
> Stack: Node.js · PostgreSQL (stored procedures, triggers, views) · Redis · Socket.IO · AngularJS · Deployed on Railway
> 
> This is a Sem IV academic project, not a production system. But the math is real. The backtest is real. The deployment is real.
> 
> GitHub: [link]  
> Live URL: [link]
> 
> #buildinpublic #webdevelopment #quantfinance #NMIMS #postgresql

---

**Post 2: The Learning Post (Mid-Development Insights)**  
*Demonstrating advanced microeconomics application natively within RDBMS constraints.*

> Something I didn't expect from a college DBMS project:
> 
> Price elasticity estimation in SQL.
> 
> PostgreSQL has `REGR_SLOPE()` — a built-in OLS regression function. `REGR_SLOPE(ln(quantity), ln(price))` gives you the price elasticity coefficient directly from your booking history.
> 
> A 10% price increase with $\varepsilon = -1.5 \rightarrow 15\%$ demand decrease.
> Revenue maximizing price $= |\varepsilon|/(|\varepsilon|-1) \times$ marginal_cost.
> 
> This is standard microeconomics from Varian's Intermediate Microeconomics. But seeing it run as a stored procedure on real data hits differently.
> 
> Building StageAlpha (event equipment rental platform) for Sem IV.
> 
> #postgresql #economics #buildinpublic #datascience
