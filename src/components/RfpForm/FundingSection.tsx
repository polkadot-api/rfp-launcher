import { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { FormInputField } from "./FormInputField";
import { RfpControlType } from "./formSchema";

export const FundingSection: FC<{ control: RfpControlType }> = ({
  control,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Funding</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormInputField
        control={control}
        name="prizePool"
        label="Prize Pool (USD)"
        description="Amount awarded to implementors"
      />
      <FormInputField
        control={control}
        name="findersFee"
        label="Finder's Fee (USD)"
        description="Amount awarded to the referral of the implementors"
      />
      <FormInputField
        control={control}
        name="supervisorsFee"
        label="Supervisors' Fee (USD)"
        description="Amount awarded split amongst the supervisors"
      />
    </CardContent>
  </Card>
);
