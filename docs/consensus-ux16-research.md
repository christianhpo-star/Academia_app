# Produce a rigorous evidence-informed design memo for a non-clinical, privacy-fir

**Question:** Produce a rigorous evidence-informed design memo for a non-clinical, privacy-first adult fitness and nutrition PWA named FORJA. It already logs weigh-ins, height/age/sex, Mifflin St Jeor resting-energy and heuristic activity factors, body circumferences, optional Samsung Galaxy Watch bioimpedance, strength/Muay Thai sessions, steps, nutrition entries and editable weight/date goals. Research evidence and clinical/consensus guidelines for (a) interpreting short-term weight variability, water fluctuations, meaningful weight changes and reassessment frequency; (b) whether and how weight change warrants reviewing protein g/kg, energy estimates, body circumferences and wearable bioimpedance, with careful distinction between weight change and actual composition; (c) frequency and quality of trend measurements for weight, waist circumference, diet entries, activity history and BIA; (d) missingness of step/meal records and avoidance of false precision; (e) digital-health reminder fatigue, autonomy, snooze/dismiss options and ethical notifications. Clearly separate research-supported practices from pragmatic *product heuristics* with no validated thresholds. Recommend conservative, flexible trigger examples, e.g. profile vs latest weight >5% and measurements 4-8 weeks stale, and whether those thresholds are justified, and prioritize non-coercive reminders. Cite DOI/title/author/year and links, discuss limitations and risk of triggering weight fixation. Format as a compact referenced evidence matrix and developer-ready acceptance criteria. Avoid medical diagnosis and prescriptive calorie deficits.

# Evidence-Informed **Architecture and Metrics** for FORJA

Dynamic body weight shifts continuously reflect rapid hydration and gastrointestinal fluxes rather than immediate changes in fat or skeletal muscle mass [[1.1]](https://consensus.app/papers/schneditz-hofmann-daytoday-variability-in-euvolemic-body-mass/w:d1aa8c5e-ae51-4a65-956a-84a151f7c6dc/) [[2.1]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/) [[3.1]](https://consensus.app/papers/bhutani-kahn-composition-of-twoweek-change-in-body-weight-under/w:1105b1f8-d1de-4320-bdfc-ed1b851d39bc/). Non-clinical digital health tools require robust filtering mechanisms and ethical communication frameworks to prevent user disengagement and reduce the risk of fixation [[4.1]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/) [[5.1]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/).

## Evidence Summary for Metric Interpretation

| Evidence Strength | Claim |
| :--- | :--- |
| Evidence strength: Strong (9/10) | **Short-term body mass variation** is driven largely by body water shifts and digestive contents, with daily fluctuations averaging ~0.5–0.7% and two-week changes comprising 84% fat-free mass [[1.1]](https://consensus.app/papers/schneditz-hofmann-daytoday-variability-in-euvolemic-body-mass/w:d1aa8c5e-ae51-4a65-956a-84a151f7c6dc/) [[6.1]](https://consensus.app/papers/vivanti-yu-short‐term-body-weight-fluctuations-in-older/w:09bc4a40-2abd-4247-adbf-1fb870b6fbae/) [[3.1]](https://consensus.app/papers/bhutani-kahn-composition-of-twoweek-change-in-body-weight-under/w:1105b1f8-d1de-4320-bdfc-ed1b851d39bc/). |
| Evidence strength: Strong (8/10) | **Consumer bioimpedance** and wearable BIA exhibit wide individual-level limits of agreement (exceeding ±6 kg fat-free mass) against multicompartment models, necessitating trend smoothing over single readings [[4.2]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/) [[7.1]](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/). |
| Evidence strength: Moderate (7/10) | **Repeated weight cycling** (≥5% swings) is independently associated with heightened cardiometabolic risk scores and incident steatotic liver disease across longitudinal cohorts [[8.1]](https://consensus.app/papers/rhee-lee-body-weight-variability-and-the-risk-of-incident/w:fa30e591-9d73-41e1-88b8-3c4cab965490/) [[9.1]](https://consensus.app/papers/swartz-wood-cardiometabolic-characteristics-of-weight-cycling/w:bee0a461-f700-408a-9e1d-14e93f6dae0d/) [[10.1]](https://consensus.app/papers/massey-siddiqui-weight-variability-and-cardiovascular-outcomes-a/w:99ea6043-6700-4f45-b5a2-e9b25a6d0eed/). |

**Figure 1:** Evidence-graded claims governing tracking thresholds and sensor fidelity

## Metric Variability and Compositional Discrepancy

Healthy human body mass fluctuates daily by 0.53% to 0.69% under standardized conditions [[1.1]](https://consensus.app/papers/schneditz-hofmann-daytoday-variability-in-euvolemic-body-mass/w:d1aa8c5e-ae51-4a65-956a-84a151f7c6dc/), with older or free-living populations commonly displaying short-term variations between 1.1% and 3.6% [[6.2]](https://consensus.app/papers/vivanti-yu-short‐term-body-weight-fluctuations-in-older/w:09bc4a40-2abd-4247-adbf-1fb870b6fbae/). Over two-week intervals under free-living conditions, approximately 84% of mass changes are composed of fat-free mass rather than adiposity [[3.1]](https://consensus.app/papers/bhutani-kahn-composition-of-twoweek-change-in-body-weight-under/w:1105b1f8-d1de-4320-bdfc-ed1b851d39bc/). Diurnal cycles, meal ingestion, and transient glycogen replenishment produce rapid weight changes that lag behind true systemic hydration or tissue remodeling [[2.2]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/) [[2.1]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/). Furthermore, within-week cyclical patterns regularly introduce temporary weekend gains of ~0.35% followed by weekday drops [[11.1]](https://consensus.app/papers/turicchi-o’driscoll-weekly-seasonal-and-holiday-body-weight/w:b6e472fd-f406-421e-a1a5-2c5dcf187d4f/) [[11]](https://consensus.app/papers/turicchi-o’driscoll-weekly-seasonal-and-holiday-body-weight/w:b6e472fd-f406-421e-a1a5-2c5dcf187d4f/).

**Fig 4.** Weekly body weight fluctuations. Weekly body weight fluctuations in all individuals and by gender (A), region (B), BMI status (C) and age group (D). Body weight has been detrended and detrended weight signifies the mean relative deviation from the body weight trend on a given day of the week. Groups are presented by colour, and groups without a letter in common for each given day were significantly different (p&lt;0.05) as tested by multi-factor ANOVA and Tukey’s post hoc. Gender differences (p&lt;0.05) are illustrated using an asterisk. [[11]](https://consensus.app/papers/turicchi-o’driscoll-weekly-seasonal-and-holiday-body-weight/w:b6e472fd-f406-421e-a1a5-2c5dcf187d4f/)

*How to read: The graph plots the relative deviation from the detrended body weight trend across the days of the week, stratified by sex, geographic region, BMI status, and age group.*

In combat sports and athletic training such as Muay Thai, acute bouts frequently induce acute mass loss exceeding 4% alongside hyperconcentrated urine markers, which are not swiftly matched by euhydrated tissue recovery despite fluid regain [[12.1]](https://consensus.app/papers/ceylan-taşkın-acute-weight-cycling-and-hydration-status-in-elite/w:c83937a6-b852-420e-bf14-e5804e2264f1/) [[12.2]](https://consensus.app/papers/ceylan-taşkın-acute-weight-cycling-and-hydration-status-in-elite/w:c83937a6-b852-420e-bf14-e5804e2264f1/). Long-term observational cohorts reveal that high successive weight variability correlates with increased risk of metabolic dysfunction-associated steatotic liver disease [[8.1]](https://consensus.app/papers/rhee-lee-body-weight-variability-and-the-risk-of-incident/w:fa30e591-9d73-41e1-88b8-3c4cab965490/), elevated triglycerides [[13.1]](https://consensus.app/papers/xu-wang-longterm-weight-variability-is-associated-with/w:fdf81299-906a-41f2-b596-41983907a16b/), and cardiovascular incidents [[10.1]](https://consensus.app/papers/massey-siddiqui-weight-variability-and-cardiovascular-outcomes-a/w:99ea6043-6700-4f45-b5a2-e9b25a6d0eed/). In contrast, early weight variability observed across daily self-weighing interventions does not reliably predict the magnitude of subsequent annual weight change [[14.1]](https://consensus.app/papers/zhong-levitsky-weight-variability-does-not-predict-weight-change/w:5ac139b2-74ce-45f4-b3f5-ce3655114660/) [[14.2]](https://consensus.app/papers/zhong-levitsky-weight-variability-does-not-predict-weight-change/w:5ac139b2-74ce-45f4-b3f5-ce3655114660/), though it can correlate weakly with regain tendencies during structured maintenance interventions [[15.1]](https://consensus.app/papers/turicchi-o’driscoll-the-impact-of-early-bodyweight-variability-on/w:2b6176ae-a6e3-4913-9f02-34b6ef20c904/). 

Wearable and consumer bioelectrical impedance analysis (BIA) algorithms often assume constant hydration and utilize generalized population regression equations [[2.3]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/) [[2.4]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/). When benchmarked against reference four-compartment models, commercial devices display limits of agreement spanning 15 to 20 percentage points for body fat percentage [[7.2]](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/) and ±6 kg for fat-free mass [[7.1]](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/). Wrist- or arm-worn BIA reflects local impedance changes that correlate with fluid shifts rather than true visceral or adipose redistribution [[2.5]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/) [[4.3]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/). In dietary tracking, higher protein intakes are associated with lean mass retention during energy restriction [[16.1]](https://consensus.app/papers/pui-stoian-db26-beyond-body-weight-the-influence-of-dietary/w:ef1953be-d09d-49d0-b96f-276377e34a70/), whereas isoenergetic shifts in protein quantity or source do not significantly alter waist circumference or overall adiposity [[17.1]](https://consensus.app/papers/ellinger-amini-protein-intake-and-body-weight-fat-mass-and-waist/w:309610a7-646a-4f2a-b1f3-8d100df47a48/) [[17.2]](https://consensus.app/papers/ellinger-amini-protein-intake-and-body-weight-fat-mass-and-waist/w:309610a7-646a-4f2a-b1f3-8d100df47a48/).

## Referenced Evidence and Heuristic Matrix

| Metric Domain | Evidence-Based Rule & Citation | Pragmatic Product Heuristic | Rationale & Behavioral Caveat |
| :--- | :--- | :--- | :--- |
| **Weight Velocity** | Short-term fluctuations (0.5–1.0%) reflect hydration and digestive mass [[1.1]](https://consensus.app/papers/schneditz-hofmann-daytoday-variability-in-euvolemic-body-mass/w:d1aa8c5e-ae51-4a65-956a-84a151f7c6dc/) [[6.1]](https://consensus.app/papers/vivanti-yu-short‐term-body-weight-fluctuations-in-older/w:09bc4a40-2abd-4247-adbf-1fb870b6fbae/) [[3.1]](https://consensus.app/papers/bhutani-kahn-composition-of-twoweek-change-in-body-weight-under/w:1105b1f8-d1de-4320-bdfc-ed1b851d39bc/). | Apply a **±3-day to 7-day moving average** to detrend weigh-ins [[5.2]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/). | Prevents overreacting to water shifts or weekend variance [[11.1]](https://consensus.app/papers/turicchi-o’driscoll-weekly-seasonal-and-holiday-body-weight/w:b6e472fd-f406-421e-a1a5-2c5dcf187d4f/). |
| **Recalibration Triggers** | ≥5% body mass shift alters total energy requirements and metabolic parameters [[9.1]](https://consensus.app/papers/swartz-wood-cardiometabolic-characteristics-of-weight-cycling/w:bee0a461-f700-408a-9e1d-14e93f6dae0d/) [[9.2]](https://consensus.app/papers/swartz-wood-cardiometabolic-characteristics-of-weight-cycling/w:bee0a461-f700-408a-9e1d-14e93f6dae0d/). | Trigger optional Mifflin-St Jeor review if **weight changes >5%** or after 6–8 weeks. | Balances physiological updates without obsessive goal manipulation [[4.4]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/). |
| **Body Composition** | Consumer BIA limits of agreement reach ±6 kg FFM [[7.1]](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/); error is 3–8% body fat [[4.2]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/). | Display 14-day rolling impedance trends; never show daily single-digit fat mass deltas. | Precludes false precision from transient hydration status [[2.4]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/) [[7.3]](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/). |
| **Waist Circumference** | Android adiposity indicates cardiometabolic risk independent of scale mass [[17.3]](https://consensus.app/papers/ellinger-amini-protein-intake-and-body-weight-fat-mass-and-waist/w:309610a7-646a-4f2a-b1f3-8d100df47a48/) [[17.2]](https://consensus.app/papers/ellinger-amini-protein-intake-and-body-weight-fat-mass-and-waist/w:309610a7-646a-4f2a-b1f3-8d100df47a48/). | Suggest optional circumferential tape logging every **4 to 6 weeks**. | Minimizes measurement error while capturing central redistribution [[4.5]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/). |
| **Missing Records** | Imputation without context introduces bias; low-burden logs preserve engagement [[5.3]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/) [[5.4]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/). | Treat missing days as unrecorded (null); compute weekly step medians instead of sums. | Avoids false precision or guilt loops from missed manual entries [[4.6]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/). |

**Figure 2:** Evidence-informed parameters versus unvalidated product heuristics for FORJA

## Engineering Acceptance Criteria

- **AC-01: Time-Series Weight Filtering**
  - Given a new scale entry, the UI must store the raw value locally and calculate an outlier-screened moving average (e.g., ±3-day window) [[5.2]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/).
  - The default chart view must highlight the rolling average curve and render individual points with reduced visual contrast to mitigate daily fixation [[5.5]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/).
  - In the event of multiple daily weigh-ins, the engine must persist only the first morning measurement [[11.2]](https://consensus.app/papers/turicchi-o’driscoll-weekly-seasonal-and-holiday-body-weight/w:b6e472fd-f406-421e-a1a5-2c5dcf187d4f/).

- **AC-02: Non-Coercive Recalibration Prompts**
  - If the detrended 7-day average differs from the profile baseline by ≥5.0% [[9.1]](https://consensus.app/papers/swartz-wood-cardiometabolic-characteristics-of-weight-cycling/w:bee0a461-f700-408a-9e1d-14e93f6dae0d/), or if energy parameters have remained untouched for >8 weeks, surface an inline banner: *"Your profile parameters have not been reviewed recently. Would you like to check them?"*
  - The banner must provide equal-prominence actions: `Review Parameters`, `Snooze for 14 Days`, and `Dismiss permanently`.
  - The application must strictly avoid prescriptive deficit recommendations, displaying Mifflin-St Jeor calculations as educational, non-diagnostic baseline estimates [[4.3]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/).

- **AC-03: Wearable Bioimpedance Guardrails**
  - Given an incoming BIA reading from Samsung Galaxy Watch, the system must display an educational modal explaining that wrist impedance tracks fluid balance rather than exact tissue fat percentage [[2.5]](https://consensus.app/papers/jankovic-kang-wireless-armworn-bioimpedance-sensor-for/w:993d3e9e-93be-4b28-b928-76591d9e86b7/) [[4.2]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/) [[7.4]](https://consensus.app/papers/oliver-vecchio-the-validity-of-bioelectrical-impedance-analysis/w:da9661aa-c9ac-4360-a10a-1900c71d1206/).
  - If the user logged a strenuous session (e.g., Muay Thai or strength training) within the preceding 12 hours, the UI must display an advisory that acute fluid losses suppress BIA reliability [[12.3]](https://consensus.app/papers/ceylan-taşkın-acute-weight-cycling-and-hydration-status-in-elite/w:c83937a6-b852-420e-bf14-e5804e2264f1/) [[12.1]](https://consensus.app/papers/ceylan-taşkın-acute-weight-cycling-and-hydration-status-in-elite/w:c83937a6-b852-420e-bf14-e5804e2264f1/).

- **AC-04: Resilient Nutrition and Step Aggregations**
  - Missing meal entries or step logs must remain unpopulated (`null`) rather than assumed to be zero.
  - Aggregate statistics must report weekly medians and active-day averages with visual indicators of data density (e.g., "based on 4 logged days") to avoid false precision [[5.1]](https://consensus.app/papers/daw-petit-novel-energy-balance-tracking-to-support/w:9612e909-ea35-467f-a631-9c5cc3ca47a8/).
  - User notification settings must strictly support manual quiet hours, variable snoozes, and zero punitive language to preserve autonomy and minimize digital fatigue [[4.4]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/) [[4.1]](https://consensus.app/papers/zakaria-leveraging-wearable-technology-to-support-behavior/w:129a8e14-2c27-49f2-ad4b-403f3067b929/).
 
_These search results were found and analyzed using Consensus, an AI-powered search engine for research. Try it at https://consensus.app. © 2026 Consensus NLP, Inc. Personal, non-commercial use only; redistribution requires copyright holders’ consent._
 
## References
 
`1.` Schneditz D, Hofmann P, Krenn S, Waller M, Mußnig S, Hecking M. Day-to-day variability in euvolemic body mass. *Renal Failure.* 2023;45:2273421-2273421. doi:10.1080/0886022x.2023.2273421
 
> [1.1] The average and median relative differences were zero, with a standard deviation (SD) of 0.53% for the one-day interval, increasing to 0.69% for the 7-day interval, and this variability was constant throughout the observation period. (Abstract)
 
`2.` Jankovic M, Kang S, Bhattacharya S, et al. Wireless arm-worn bioimpedance sensor for continuous assessment of whole-body hydration. *Proceedings of the National Academy of Sciences.* 2025;122:e2504278122-e2504278122. doi:10.1073/pnas.2504278122
 
> [2.1] This discrepancy can be attributed to the contribution of solid foods to body weight and delayed tissue rehydration after fluid intake. (Body)
 
> [2.2] However, after the dehydration test ended, the body weight quickly recovered after a major meal, while continued to increase mildly after drink and food intake and only started a significant decrease about three hours later. (Body)
 
> [2.3] The use of prediction equations for TBW and FFM rely on parameters such as Height2/Resistance, body weight, age, gender, reactance, and height (58), and additionally rely on the assumption of constant hydration of the FFM (59). (Body)
 
> [2.4] Moreover, the models and equations for BIA are typically derived in healthy people and consequently tend to yield inaccurate values of soft tissue composition for individuals with fluid variation. (Body)
 
> [2.5] The strong correlation between the observed increase in arm Bio-Z and the percent body weight loss suggests that arm Bio-Z can effectively serve as a surrogate for WBH. (Body)
 
`3.` Bhutani S, Kahn E, Tasali E, Schoeller DA. Composition of two-week change in body weight under unrestricted free-living conditions. *Physiological Reports.* 2017;5:e13336-e13336. doi:10.14814/phy2.13336
 
> [3.1] A unit change in body weight was composed of 84% change in FFM in the combined dataset indicating that 2-week fluctuation in body weight is largely composed of FFM The energy density of 1-3 kg short-term changes in body weight averaged 2380 kcal/kg. (Abstract)
 
`4.` Zakaria L. Leveraging Wearable Technology to Support Behavior Change in Personalized Nutrition and Lifestyle Medicine. *American Journal of Lifestyle Medicine.* 2026;20:1019-1033. doi:10.1177/15598276261450511
 
> [4.1] Evidence across domains such as sleep, stress regulation, physical activity, and glycemic response suggests that these tools are most effective when used to identify trends over time between clinical encounters and guide personalized adjustments, rather than as isolated metrics. (Body)
 
> [4.2] For home BIA body composition devices, evidence indicates acceptable reproducibility for weight and moderate agreement with DEXA for fat mass and lean mass at the group level, with individual-level error commonly ranging 3-8 percentage points for body fat. (Body)
 
> [4.3] 31 Visceral fat estimation via BIA shows weakto-moderate correlation with imaging-derived visceral adipose tissue and should not be treated as a diagnostic measure of cardiometabolic risk. (Body)
 
> [4.4] Integrated within a clinician-guided, patientcentered framework, these technologies can reinforce selfregulation, refine individualized recommendations, and extend care between visits. (Body)
 
> [4.5] 33 As with HRV and CGM, the strongest evidence supports trend monitoring under standardized conditions rather than reliance on single absolute values. (Body)
 
> [4.6] Many studies combine wearable monitoring with co-interventions (coaching, prompts, education), making it difficult to isolate the independent effect of the device itself. (Body)
 
`5.` Daw AB, Petit M, Willis SA, James LJ, King JA. Novel energy balance tracking to support personalised AI health coaching: a real-world evaluation of the ENHANCE framework. *International Journal of Obesity.* 2026;50:1846-1851. doi:10.1038/s41366-026-02100-8
 
> [5.1] By avoiding intrusive food tracking and blinding participants to feedback, it ensured naturalistic behaviour and sustained adherence during a disruptive and high-risk period for fat gain [21]. (Body)
 
> [5.2] - Smoothed trend: Generated by removing outliers from raw data using an Interquartile Range (IQR) method (IQR×1.5) and applying a simple moving average (±3 days). (Body)
 
> [5.3] The study design prioritised ecological validity and feasibility without compromising data quality. (Body)
 
> [5.4] Participants submitted daily blinded body weight measurements via Wi-Fi scales and EB-related questions via a mobile app, taking <2 min. (Abstract)
 
> [5.5] Although objective, these measurements vary with natural hydration shifts and data anomalies, making them misleading if interpreted directly as fat weight change. (Body)
 
`6.` Vivanti A, Yu L, Palmer MA, Dakin L, Sun J, Campbell KL. Short‐term body weight fluctuations in older well‐hydrated hospitalised patients. *Journal of Human Nutrition and Dietetics.* 2013;26:429-435. doi:10.1111/jhn.12034
 
> [6.1] Time of weigh-in accounted for 99.8% of the variation in weight fluctuation (P < 0.05), with the lowest fluctuations observed when weights were compared at the same time each day (≤0.4 kg). (Abstract)
 
> [6.2] Results: Weight fluctuation for each participant [mean (SD) 80.2 (4.2) years; male 60.0%, n = 10] over 3 days ranged from 1.1% to 3.6%. (Abstract)
 
`7.` Oliver CJ, Del Vecchio L, Minehan M, et al. The Validity of Bioelectrical Impedance Analysis Compared to a Four-Compartment Model in Healthy Adults: A Systematic Review. *Journal of Functional Morphology and Kinesiology.* 2026;11:65-65. doi:10.3390/jfmk11010065
 
> [7.1] For fat-free mass, mean bias ranged from -3.9 kg to +1.8 kg, with limits of agreement often exceeding ±6 kg. (Abstract)
 
> [7.2] Across the 12 studies, mean bias for percentage body fat between BIA and the 4C model ranged from -3.5% to +4.4%, with limits of agreement typically spanning 15 to 20 percentage points. (Abstract)
 
> [7.3] Conclusions: BIA estimates of percentage body fat and fat-free mass were overall not equivalent to the 4C model. (Abstract)
 
> [7.4] These wide limits indicate non-equivalence at the individual level despite small mean differences. (Abstract)
 
`8.` Rhee E, Lee W. Body weight variability and the risk of incident metabolic dysfunction–associated steatotic liver disease (MASLD): a retrospective cohort study from the Kangbuk Samsung Health Study. *Cardiovascular Prevention and Pharmacotherapy.* 2026;8:69-77. doi:10.36011/cpp.2026.8.e10
 
> [8.1] After adjustment for age, sex, baseline body mass index, systolic blood pressure, and fasting glucose, participants in the highest ASV quartile had a higher risk of MASLD than those in the lowest quartile (adjusted hazard ratio [aHR], 1.64; 95% confidence interval [CI], 1.25–2.14). (Abstract)
 
`9.` Swartz AZ, Wood K, Farber‐Eger EH, Petty AS, Silver HJ. Cardiometabolic characteristics of weight cycling: results from a mid‐South regional comprehensive health care system. *Obesity.* 2024;32:2045-2059. doi:10.1002/oby.24163
 
> [9.1] In contrast, we used percentage change from each prior weight as a loss or gain of 5% to 10%, which is associated with significant changes in blood pressure, glucose, and lipids [20, 34], as well as overall cardiometabolic risk [35, 36]. (Body)
 
> [9.2] Patients with a history of malignant neoplasm, bariatric surgery, implausible BMI (e.g., <15 or >80 kg/m2), or missing documented height were excluded, yielding 83,261 participants categorized by weight trajectory, i.e., weight-stable, weight-gainer, weight-loser, or weight-cycler, based on criteria of ≥5% weight-change thresholds. (Abstract)
 
`10.` Massey RJ, Siddiqui MK, Pearson ER, Dawed AY. Weight variability and cardiovascular outcomes: a systematic review and meta-analysis. *Cardiovascular Diabetology.* 2023;22:5-5. doi:10.1186/s12933-022-01735-x
 
> [10.1] Individuals in the highest strata of body weight variability were found to have significantly increased risk of any CV event (RR = 1.27; 95% Confidence Interval (CI) 1.17-1.38; P < 0.0001; I2 = 97.28%), cardiovascular death (RR = 1.29; 95% CI 1.03-1.60; P < 0.0001; I2 = 55.16%), myocardial infarction (RR = 1.32; 95% CI 1.09-1.59; P = 0.0037; I2 = 97.14%), stroke (RR = 1.21; 95% CI 1.19-1.24; P < 0.0001; I2 = 0.06%), and compound CVD outcomes (RR = 1.36; 95% CI 1.08-1.73; P = 0.01; I2 = 92.41%). (Abstract)
 
`11.` Turicchi J, O’Driscoll R, Horgan GW, et al. Weekly, seasonal and holiday body weight fluctuation patterns among individuals engaged in a European multi-centre behavioural weight loss maintenance intervention. *PLoS ONE.* 2020;15:e0232152-e0232152. doi:10.1371/journal.pone.0232152
 
> [11.1] Results: Within-week fluctuations of 0.35% were observed, characterised by weekend weight gain and weekday reduction which differed between all groups. (Abstract)
 
> [11.2] In the event of 2 or more weight measures in one day, we utilized the first recorded weight. (Body)
 
`12.` Ceylan B, Taşkın HB, Sarıkaya U, Pekel HA, Sabırlı TN. Acute weight cycling and hydration status in elite kickboxers: a repeated-measures field study. *BMC Sports Science Medicine and Rehabilitation.* 2026;18. doi:10.1186/s13102-026-01669-x
 
> [12.1] RESULTS: Athletes underwent significant rapid weight loss (RWL), losing an average of 3.1 ± 1.7 kg (4.2%) in the week leading up to the weigh-in. (Abstract)
 
> [12.2] Notably, while 50% of athletes were hypohydrated at T1, all remained hypohydrated on competition day (T4) despite the substantial weight regain. (Abstract)
 
> [12.3] Before the measurement, to ensure the reliability of segmental body composition data, athletes were instructed to abstain from engaging in any vigorous physical activity or exposure to heat (e.g., saunas, hot showers) for a minimum of 12 h prior to the assessment [33]. (Body)
 
`13.` Xu M, Wang H, Zhu L, Liu X. Long-Term Weight Variability Is Associated with Higher Triglyceride Concentrations After Accounting for Long-Term Weight Slope. *Nutrients.* 2026;18:2605-2605. doi:10.3390/nu18162605
 
> [13.1] Results: In the core model, each 1 SD increment in CV was associated with 2.7% higher triglyceride concentrations (β = 0.026, 95% CI: 0.007 to 0.045; p = 0.007). (Abstract)
 
`14.` Zhong Y, Levitsky DA, Barré LK. Weight Variability Does Not Predict Weight Change in Participants in a Daily Weighing Study (P21-020-19). *Current Developments in Nutrition.* 2019;3:nzz041.P21-020. doi:10.1093/cdn/nzz041.p21-020-19
 
> [14.1] Six-month weight variability was not associated with absolute weight change (lb) from 6 to 12 months (Spearman's ρ = -0.06, P = 0.49). (Abstract)
 
> [14.2] Conclusions Among adults participating in a daily weighing study, early weight variability did not predict the magnitude of weight change within one year. (Abstract)
 
`15.` Turicchi J, O’Driscoll R, Lowe MR, et al. The impact of early body-weight variability on long-term weight maintenance: exploratory results from the NoHoW weight-loss maintenance intervention. *International Journal of Obesity.* 2020;45:525-534. doi:10.1038/s41366-020-00706-0
 
> [15.1] Conclusion: Body-weight variability over the first 9 and 12 weeks of a weight-loss maintenance intervention weakly predicted increased weight at 12 and 18 months. (Abstract)
 
`16.` Pui R, Stoian DL. DB26 Beyond Body Weight: The Influence of Dietary Patterns on Body Composition. *European Journal of Endocrinology.* 2026;195. doi:10.1093/ejendo/lvag128.036
 
> [16.1] Additionally, patients following higher-protein dietary regimens demonstrated a trend toward improved preservation of muscle mass compared with those receiving standard protein intake. (Abstract)
 
`17.` Ellinger S, Amini AM, Haardt J, et al. Protein intake and body weight, fat mass and waist circumference: an umbrella review of systematic reviews for the evidence-based guideline on protein intake of the German Nutrition Society. *European Journal of Nutrition.* 2023;63:3-32. doi:10.1007/s00394-023-03220-x
 
> [17.1] Our major finding is that there is 'possible' evidence that under isoenergetic study conditions the amount of protein did not affect BW, FM and WC in the general adult population. (Discussion)
 
> [17.2] In studies without energy restriction, a high-protein diet did not modulate BW, FM and WC in adults in general (all "possible" evidence); for older adults, overall certainty of evidence was "insufficient" for all parameters. (Abstract)
 
> [17.3] Android obesity is of great concern due to the increased risk of obesityassociated diseases, such as type 2 diabetes mellitus, hypertension, cardiovascular diseases, and many types of cancer [2-4]. (Introduction)
