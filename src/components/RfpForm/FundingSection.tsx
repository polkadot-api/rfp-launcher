"use client"

import { formatToken } from "@/lib/formatToken"
import { useStateObservable } from "@react-rxjs/core"
import { TriangleAlert, CheckCircle2 } from "lucide-react"
import { type FC, useEffect } from "react"
import { useWatch, type DeepPartialSkipArrayKey } from "react-hook-form"
import { openSelectAccount, selectedAccount$ } from "../SelectAccount"
import { estimatedCost$, signerBalance$ } from "./data"
import { calculatePriceTotals, setBountyValue } from "./data/price"
import { currencyRate$ } from "@/services/currencyRate"
import { FormInputField } from "./FormInputField"
import { type RfpControlType, type FormSchema, parseNumber } from "./formSchema"

export const FundingSection: FC<{ control: RfpControlType }> = ({ control }) => (
  <div className="poster-card">
    <h3 className="text-3xl font-medium mb-8 text-midnight-koi">Funding</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <FormInputField
        control={control}
        name="prizePool"
        label="Prize Pool (USD)"
        description="amount awarded to implementors"
        type="number"
      />
      <FormInputField
        control={control}
        name="findersFee"
        label="Finder's Fee (USD)"
        description="amount awarded to the referral"
        type="number"
      />
      <FormInputField
        control={control}
        name="supervisorsFee"
        label="Supervisors' Fee (USD)"
        description="amount split amongst supervisors"
        type="number"
      />
    </div>
    <BalanceCheck control={control} />
  </div>
)

const BalanceCheck: FC<{ control: RfpControlType }> = ({ control }) => {
  const prizePool = useWatch({ control, name: "prizePool" })
  const findersFee = useWatch({ control, name: "findersFee" })
  const supervisorsFee = useWatch({ control, name: "supervisorsFee" })

  const currencyRate = useStateObservable(currencyRate$)
  const estimatedCost = useStateObservable(estimatedCost$)
  const selectedAccount = useStateObservable(selectedAccount$)
  const currentBalance = useStateObservable(signerBalance$)

  useEffect(() => {
    const formValuesForTotals: DeepPartialSkipArrayKey<FormSchema> = {
      prizePool: parseNumber(prizePool) ?? undefined,
      findersFee: parseNumber(findersFee) ?? undefined,
      supervisorsFee: parseNumber(supervisorsFee) ?? undefined,
    }
    const { totalAmountWithBuffer } = calculatePriceTotals(formValuesForTotals, currencyRate)
    setBountyValue(totalAmountWithBuffer)
  }, [prizePool, findersFee, supervisorsFee, currencyRate])

  const prizePoolAmount = parseNumber(prizePool) || 0

  const renderBalanceCheckContent = () => {
    if (prizePoolAmount === 0) return null // Don't show balance status if no prize pool entered

    // This means bountyValue was set (due to prizePoolAmount > 0),
    // but other async parts of estimatedCost$ (like API calls for deposit constants) might still be resolving,
    // or currencyRate is null, leading to totalAmountWithBuffer being null.
    if (estimatedCost == null) {
      return <div className="text-pine-shadow-60">Calculating minimum cost...</div>
    }

    if (!selectedAccount) {
      return (
        <div className="flex items-center gap-4">
          <button type="button" className="poster-btn btn-primary" onClick={openSelectAccount}>
            Connect Wallet
          </button>
          <span className="text-pine-shadow">To check your balance</span>
        </div>
      )
    }
    if (currentBalance == null) return <div className="text-pine-shadow-60">Fetching your balance...</div>

    const totalCost = estimatedCost.deposits + estimatedCost.fees

    if (currentBalance < totalCost) {
      return (
        <div className="poster-alert alert-error flex items-center gap-3">
          <TriangleAlert size={20} className="shrink-0" />
          <div>
            <strong>Uh-oh:</strong> not enough balance ({formatToken(currentBalance)}). Please add funds or select
            another wallet.
          </div>
        </div>
      )
    }
    return (
      <div className="poster-alert alert-success flex items-center gap-3">
        <CheckCircle2 size={20} className="shrink-0 text-lilypad" />
        <div>
          <strong>Rad:</strong> you have enough balance ({formatToken(currentBalance)}) to launch the RFP 🚀
        </div>
      </div>
    )
  }

  return (
    <div className="bg-canvas-cream border border-pine-shadow-20 rounded-lg p-6">
      {prizePoolAmount > 0 ? (
        <p className="text-pine-shadow leading-relaxed mb-4">
          You'll need a minimum of{" "}
          {estimatedCost ? (
            <strong className="text-midnight-koi font-semibold">
              {formatToken(estimatedCost.deposits + estimatedCost.fees)}
            </strong>
          ) : (
            <span className="text-pine-shadow-60">(Calculating…)</span>
          )}{" "}
          to submit the RFP ({formatToken(estimatedCost?.fees)} in fees. You'll get{" "}
          {formatToken(estimatedCost?.deposits)} in deposits back once the RFP ends).
        </p>
      ) : (
        <p className="text-pine-shadow leading-relaxed mb-4">
          Enter a prize pool amount to see the estimated minimum cost to submit the RFP.
        </p>
      )}
      <div>{renderBalanceCheckContent()}</div>
    </div>
  )
}

