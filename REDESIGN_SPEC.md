# PC Frontier Lab — TypeScript / 3D Office Redesign Specification

This document fixes the redesign requirements discussed after the first prototype. It is the implementation baseline for version 0.2.

## Core experience

The game begins in 2015 and runs continuously. The main screen is a living Three.js office rather than a menu dashboard. Desks, staff, the product display, server area, meeting room and management desk act as visual navigation points. Important decisions open compact management panels over the office.

The intended loop is:

1. Build a long-running CPU or GPU series.
2. Research enough to raise that series' technical ceiling.
3. Design the next generation within technical and financial limits.
4. Pay design, mask, prototype and validation costs while time advances.
5. Contract a factory and reserve finite weekly capacity.
6. Launch the generation with a price, production allocation and lifecycle.
7. Read demand, actual sales, inventory, reviews and lost-sales reasons.
8. Reinvest or fail while Intel, AMD, NVIDIA and fictional firms release competing generations.

## Interaction and UX

- Time advances automatically, with pause, x1, x3 and x8 controls always visible.
- The office is always visible behind the interface.
- The left navigation contains only six high-level actions.
- A single “next action” card explains the most urgent decision.
- Product pages show current weekly sales, demand, demand fulfilment, inventory, rating, profit and trend before detailed data.
- Positive and negative sales causes are written in plain language.
- Design uses six main sliders. Detailed consequences are calculated and displayed automatically.
- The player does not select a target market. Audience fit is inferred from performance, price, efficiency, reliability and series philosophy.

## Series and generations

A series owns a name, CPU/GPU category, design philosophy, brand value, accumulated technical legacy and generation count. Each release is the next generation of an existing series. A successful generation increases brand and legacy, allowing later products to start from a stronger position without removing research or cost constraints.

The initial company has one CPU series and one GPU series, but neither can reach late-game values. Slider caps depend on:

- current year;
- CPU/GPU research level;
- series technical legacy;
- office level.

## Cost and difficulty model

The game must not allow a free maximum-spec product. Every generation can incur:

- architecture and detailed-design cost;
- weekly development burn;
- mask and tooling cost;
- prototype cost;
- validation cost;
- problem-resolution cost;
- factory signup fee;
- weekly manufacturing-capacity reservation;
- per-unit manufacturing cost;
- salaries and office overhead;
- inventory holding cost;
- support and warranty cost;
- research expenditure.

A project pauses when funding becomes inadequate. A company with negative cash pauses the simulation. High performance can also lower yield, increase die size and thermals, increase development complexity and create expensive validation failures.

## Factory system

Factories are contracted separately from development. Each foundry has an unlock year, process class, quality, reliability, cost multiplier, signup fee, minimum contract length and finite weekly capacity.

A product receives a production allocation from one active factory contract. Weekly output is constrained by:

- contracted capacity;
- product allocation;
- design yield;
- factory reliability.

Sales cannot exceed current inventory. Demand beyond supply is clearly reported as lost opportunity. Excess inventory produces holding cost. Contracts charge reservation fees even when capacity is unused.

## Product lifecycle

At launch the player chooses price, production allocation and a 52–104 week lifecycle. The product automatically enters end-of-life when that date arrives. Demand follows a launch ramp and gradual decline, and competition can accelerate weak sales before EOL.

## Product evaluation and sales clarity

Each product shows:

- overall score out of 10;
- performance, value, efficiency, reliability and software scores;
- weekly demand and weekly sales;
- demand fulfilment percentage;
- weekly trend;
- current inventory;
- lifetime revenue and profit;
- a demand-versus-sales history chart;
- explicit reasons for strong sales;
- explicit reasons for weak sales or lost sales;
- remaining weeks until automatic EOL.

## Competition

Intel, AMD and NVIDIA exist as long-running real-company competitors. Historical models use historical names for context. Models generated after the reliable historical period use clearly marked game-fictional names and are not presented as official roadmaps.

Fictional companies have cash, technology, brand, momentum and status. They can:

- enter the CPU or GPU market;
- grow rapidly after a strong generation;
- struggle after weak sales or high burn;
- be acquired by a larger company;
- leave the market.

Competitors periodically launch new series models, change the market performance baseline and make old player products lose relevance.

## Visual direction

The office uses original low-poly geometry with physically based materials, shadows, tone mapping, fog, multiple light sources, animated staff and a lit product showcase. The visual target is a readable management diorama, not a copy of any existing game's art, interface or assets.

Future improvements should add employee pathfinding, office expansion, production-line visualization, richer product meshes and event cut-ins without replacing this office-first interaction model.

## Implemented depth pass

Version 0.2 also treats employee specialties as simulation inputs rather than labels. Architecture, clock, cache, yield, power, driver, quality, brand and supply specialists modify the corresponding product and company calculations. Quarterly management, intellectual-property and insurance expenses create additional cash pressure. Product analysis now recommends a next action and exposes inventory capital, unit margin and lost sales directly.
