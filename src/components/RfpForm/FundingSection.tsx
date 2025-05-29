"use client"

import { formatToken } from "@/lib/formatToken"
import { useStateObservable } from "@react-rxjs/core"
import { TriangleAlert, CheckCircle2 } from "lucide-react"
import type { FC } from "react"
import { openSelectAccount, selectedAccount$ } from "../SelectAccount"
import { estimatedCost$, signerBalance$ } from "./data"
import { FormInputField } from "./FormInputField"
import type { RfpControlType } from "./formSchema"

export const FundingSection: FC<{ control: RfpControlType }> = ({ control }) => (
  <div className="poster-card">
    <h3 className="text-3xl font-medium mb-8 text-midnight-koi">funding</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <FormInputField
        control={control}
        name="prizePool"
        label="prize pool (usd)"
        description="amount awarded to implementors"
        type="number"
      />
      <FormInputField
        control={control}
        name="findersFee"
        label="finder's fee (usd)"
        description="amount awarded to the referral"
        type="number"
      />
      <FormInputField
        control={control}
        name="supervisorsFee"
        label="supervisors' fee (usd)"
        description="amount split amongst supervisors"
        type="number"
      />
    </div>
    <BalanceCheck />
  </div>
)

const BalanceCheck = () => {
  const estimatedCost = useStateObservable(estimatedCost$)
  const selectedAccount = useStateObservable(selectedAccount$)
  const currentBalance = useStateObservable(signerBalance$)

  const renderBalanceCheck = () => {
    if (estimatedCost == null) return <div className="text-pine-shadow-60">calculating minimum cost...</div>
    if (!selectedAccount) {
      return (
        <div className="flex items-center gap-4">
          <button type="button" className="poster-btn btn-primary" onClick={openSelectAccount}>
            connect wallet
          </button>
          <span className="text-pine-shadow">to check your balance</span>
        </div>
      )
    }
    if (currentBalance == null) return <div className="text-pine-shadow-60">fetching your balance...</div>

    const totalCost = estimatedCost.deposits + estimatedCost.fees

    if (currentBalance < totalCost) {
      return (
        <div className="poster-alert alert-error flex items-center gap-3">
          <TriangleAlert size={20} className="shrink-0" />
          <div>
            <strong>uh-oh:</strong> not enough balance ({formatToken(currentBalance)}). please add funds or select
            another wallet.
          </div>
        </div>
      )
    }
    return (
      <div className="poster-alert alert-success flex items-center gap-3">
        <CheckCircle2 size={20} className="shrink-0 text-lilypad" />
        <div>
          <strong>rad:</strong> you have enough balance ({formatToken(currentBalance)}) to launch the rfp 🚀
        </div>
      </div>
    )
  }

  return (
    <div className="bg-canvas-cream border border-pine-shadow-20 rounded-lg p-6">
      <p className="text-pine-shadow leading-relaxed mb-4">
        you'll need a minimum of{" "}
        {estimatedCost ? (
          <strong className="text-midnight-koi font-semibold">
            {formatToken(estimatedCost.deposits + estimatedCost.fees)}
          </strong>
        ) : (
          <span className="text-pine-shadow-60">(calculating…)</span>
        )}{" "}
        to submit the rfp ({formatToken(estimatedCost?.fees)} in fees, you'll get {formatToken(estimatedCost?.deposits)}{" "}
        in deposits back once the rfp ends).
      </p>
      <div>{renderBalanceCheck()}</div>
    </div>
  )
}

