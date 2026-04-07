import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Circle, Copy } from "lucide-react";

function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function money(v){return new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(Number.isFinite(v)?v:0)}

function monthlyPayment(p,r,y){const m=y*12;const i=r/100/12;if(p<=0||m<=0)return 0;if(i===0)return p/m;return (p*i)/(1-Math.pow(1+i,-m))}
function maxLoanFromMonthlyPayment(pmt,r,y){const m=y*12;const i=r/100/12;if(pmt<=0||m<=0)return 0;if(i===0)return pmt*m;return pmt*((1-Math.pow(1+i,-m))/i)}

function Field({label,value,onChange}){
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e)=>onChange(n(e.target.value))}/>
    </div>
  )
}

function Metric({label,value}){
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </CardContent></Card>
  )
}

function Stoplight({signal}){
  const color = signal === "GO" ? "text-green-500" : signal === "YIELD" ? "text-yellow-500" : "text-red-500";
  return (
    <div className={`flex items-center gap-2 font-bold ${color}`}>
      <Circle className="w-4" /> {signal}
    </div>
  );
}

export default function App(){

  const [mode,setMode]=useState("realistic")

  const [purchasePrice,setPurchasePrice]=useState(750000)
  const [offerPrice,setOfferPrice]=useState(750000)
  const [downPct,setDownPct]=useState(25)

  // NEW STRUCTURED INTEREST
  const [primeRate,setPrimeRate]=useState(5.2)
  const [spread,setSpread]=useState(3)
  const [feePct,setFeePct]=useState(2)
  const [feeFinanced,setFeeFinanced]=useState(true)

  const [amortYears,setAmortYears]=useState(25)

  const [occupancyPct,setOccupancyPct]=useState(42)
  const [nightlySites,setNightlySites]=useState(50)
  const [operatingDays,setOperatingDays]=useState(180)
  const [nightlyRate,setNightlyRate]=useState(52)
  const [seasonalSites,setSeasonalSites]=useState(10)
  const [seasonalMonthlyRate,setSeasonalMonthlyRate]=useState(850)
  const [seasonalMonths,setSeasonalMonths]=useState(6)
  const [annualSites,setAnnualSites]=useState(0)
  const [annualMonthlyRate,setAnnualMonthlyRate]=useState(0)
  const [otherIncome,setOtherIncome]=useState(10000)

  const [expenseRatio,setExpenseRatio]=useState(45)
  const [targetDscr,setTargetDscr]=useState(1.25)

  function adjust(val,shift){
    if(mode==="optimistic")return val+shift
    if(mode==="conservative")return val-shift
    return val
  }

  const results=useMemo(()=>{
    const price=offerPrice||purchasePrice
    const down=price*(downPct/100)

    const baseLoan=price-down

    const effectiveRate = primeRate + spread

    // Fee handling toggle
    const feeAmount = baseLoan * (feePct/100)
    const loan = feeFinanced ? baseLoan + feeAmount : baseLoan
    const upfrontCash = feeFinanced ? 0 : feeAmount

    const debt=monthlyPayment(loan,effectiveRate,amortYears)*12

    const occ=adjust(occupancyPct,10)
    const exp=adjust(expenseRatio,-5)

    const nightly=nightlySites*operatingDays*(occ/100)*nightlyRate
    const seasonal=seasonalSites*seasonalMonthlyRate*seasonalMonths
    const annual=annualSites*annualMonthlyRate*12

    const egi=nightly+seasonal+annual+otherIncome
    const opex=egi*(exp/100)
    const noi=egi-opex
    const cf=noi-debt
    const dscr=debt>0?noi/debt:0

    const maxDebt=noi/targetDscr
    const maxLoan=maxLoanFromMonthlyPayment(maxDebt/12,effectiveRate,amortYears)
    const suggested=maxLoan/(1-downPct/100)

    let signal="STOP"
    if(dscr>1.4&&cf>0)signal="GO"
    else if(dscr>1.2)signal="YIELD"

    return {noi,cf,dscr,suggested,signal,nightly,seasonal,annual,egi,effectiveRate,loan,upfrontCash}

  },[purchasePrice,offerPrice,downPct,primeRate,spread,feePct,amortYears,occupancyPct,nightlySites,operatingDays,nightlyRate,seasonalSites,seasonalMonthlyRate,seasonalMonths,annualSites,annualMonthlyRate,otherIncome,expenseRatio,mode])

  const killers=[]
  if(results.dscr<1.2)killers.push("DSCR too low → lower price")
  if(results.cf<0)killers.push("Negative cash flow → adjust operations or price")

  function copy(text){navigator.clipboard.writeText(text)}

  const sellerMsg = `Based on underwriting, the property supports ~${money(results.suggested)}. Given current performance and risk, we would be comfortable proceeding closer to ${money(results.suggested*0.85)}.`

  const investorMsg = `Deal Summary:\nNOI: ${money(results.noi)}\nCash Flow: ${money(results.cf)}\nDSCR: ${results.dscr.toFixed(2)}\nRate: ${results.effectiveRate.toFixed(2)}%\nTarget Entry: ${money(results.suggested)}`

  return (
    <div className="p-4 space-y-4">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Jake Sentinel Deal Analyzer</h1>
          <div className="text-xs text-gray-500">Underwrite • Decide • Negotiate</div>
        </div>
        <Stoplight signal={results.signal}/>
      </div>

      <div className="flex gap-2">
        <Button onClick={()=>setMode("optimistic")}>Optimistic</Button>
        <Button onClick={()=>setMode("realistic")}>Realistic</Button>
        <Button onClick={()=>setMode("conservative")}>Conservative</Button>
      </div>

      <Tabs defaultValue="inputs">

        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="killer">Deal Killer</TabsTrigger>
          <TabsTrigger value="offer">Offer</TabsTrigger>
        </TabsList>

        <TabsContent value="inputs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice}/>
            <Field label="Offer Price" value={offerPrice} onChange={setOfferPrice}/>
            <Field label="Down %" value={downPct} onChange={setDownPct}/>

            <Field label="Prime Rate %" value={primeRate} onChange={setPrimeRate}/>
            <Field label="Spread %" value={spread} onChange={setSpread}/>
            <Field label="Fee %" value={feePct} onChange={setFeePct}/>

            <div className="flex items-center gap-2">
              <Label>Fee Financed?</Label>
              <input type="checkbox" checked={feeFinanced} onChange={(e)=>setFeeFinanced(e.target.checked)} />
            </div>

            <Field label="Nightly Sites" value={nightlySites} onChange={setNightlySites}/>
            <Field label="Nightly Rate" value={nightlyRate} onChange={setNightlyRate}/>
            <Field label="Occupancy %" value={occupancyPct} onChange={setOccupancyPct}/>
            <Field label="Expenses %" value={expenseRatio} onChange={setExpenseRatio}/>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="NOI" value={money(results.noi)}/>
            <Metric label="Cash Flow" value={money(results.cf)}/>
            <Metric label="DSCR" value={results.dscr.toFixed(2)}/>
            <Metric label="Effective Rate" value={results.effectiveRate.toFixed(2)+"%"}/>
            <Metric label="Suggested Offer" value={money(results.suggested)}/>
          </div>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Nightly Revenue" value={money(results.nightly)}/>
            <Metric label="Seasonal Revenue" value={money(results.seasonal)}/>
            <Metric label="Annual Revenue" value={money(results.annual)}/>
            <Metric label="Total Revenue" value={money(results.egi)}/>
          </div>
        </TabsContent>

        <TabsContent value="killer">
          <Card>
            <CardHeader><CardTitle>Deal Killer</CardTitle></CardHeader>
            <CardContent>
              {killers.length===0?"No major issues":killers.map((k,i)=>(
                <div key={i} className="flex gap-2 text-red-500"><AlertTriangle className="w-4"/> {k}</div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offer">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Metric label="Aggressive" value={money(results.suggested*0.85)}/>
            <Metric label="Target" value={money(results.suggested)}/>
            <Metric label="Walk Away" value={money(results.suggested*1.1)}/>
          </div>
          <div className="flex gap-2">
            <Button onClick={()=>copy(sellerMsg)}><Copy className="w-4"/> Copy Seller Message</Button>
            <Button onClick={()=>copy(investorMsg)}><Copy className="w-4"/> Copy Investor Summary</Button>
          </div>
        </TabsContent>

      </Tabs>

    </div>
  )
}
