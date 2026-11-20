import React from "react";
import { CheckCircle2 } from "lucide-react";
import { EMICalculator } from "../../components/common/EMICalculator";
import { FadeUp } from "../../components/motion/HomeMotion";

export default function HomeEmiSection() {
  return (
    <section className="home-section home-emi-section" id="emi-calculator" aria-labelledby="home-emi-title">
      <div className="home-container home-emi-grid">
        <FadeUp>
          <div className="home-emi-copy">
            <p className="home-kicker">Plan your repayment</p>
            <h2 id="home-emi-title">Know the monthly number before you commit.</h2>
            <p>Adjust the amount, rate and tenure to see an indicative EMI and total interest. Your lender will confirm the final rate and schedule.</p>
            <ul>
              <li><CheckCircle2 size={17} /> Change assumptions instantly</li>
              <li><CheckCircle2 size={17} /> Compare principal and interest</li>
              <li><CheckCircle2 size={17} /> Take your estimate to an advisor</li>
            </ul>
          </div>
        </FadeUp>
        <EMICalculator compact={false} showApplyCTA />
      </div>
    </section>
  );
}
