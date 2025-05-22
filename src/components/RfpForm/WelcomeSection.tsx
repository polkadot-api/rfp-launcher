import { FC } from "react";
import { Card, CardContent } from "../ui/card";

export const WelcomeSection: FC = () => (
  <Card>
    <CardContent className="text-sm space-y-1">
      <p>
        This tool will guide you through all the steps to launch an RFP (Request
        for Proposal).
      </p>
      <p>
        After completing the form, you'll be prompted to submit three
        transactions to set up the RFP. The tool will then provide a
        pre-formatted RFP body, which you can copy and paste into the RFP
        referendum.
      </p>
    </CardContent>
  </Card>
);
