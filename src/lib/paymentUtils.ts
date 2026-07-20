export interface MilestoneItem {
  name: string;
  amount: number;
  isDeposit?: boolean;
}

export interface PaymentMilestone {
  date: string;
  amount: number;
  label: string;
  items: MilestoneItem[];
}

export function getPaymentMilestones(packageId: string, addJacket: boolean): PaymentMilestone[] {
  const milestones: PaymentMilestone[] = [];

  // 1. July 19 Milestone (Common across all packages)
  const july19Items: MilestoneItem[] = [];
  if (packageId !== "jacket-only") {
    july19Items.push(
      { name: "Box Printing", amount: 15, isDeposit: true },
      { name: "Shirt", amount: 35, isDeposit: true },
      { name: "Tumbler", amount: 15, isDeposit: true },
      { name: "Rally Towel", amount: 5, isDeposit: true },
      { name: "Engraved Whiskey Glass", amount: 30, isDeposit: true }
    );
  }
  if (addJacket) {
    july19Items.push({ name: "Jacket Optional (Deposit)", amount: 70, isDeposit: true });
  }
  const julyTotal = july19Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "July 19",
    label: "📅 Initial Installment / Deposit",
    amount: julyTotal,
    items: july19Items,
  });

  // 2. August 15 Milestone (Varies by package)
  const august15Items: MilestoneItem[] = [];
  if (packageId === "langston-taylor") {
    august15Items.push({ name: "Step Show", amount: 20 });
    august15Items.push({ name: "Brotherhood Event", amount: 30 });
  } else if (packageId === "leonard-morse") {
    august15Items.push({ name: "Brotherhood Event", amount: 30 });
  } else if (packageId === "charles-brown") {
    august15Items.push({ name: "Brotherhood Event", amount: 10 });
  } else if (packageId === "box-items") {
    august15Items.push({ name: "Chapter Donation", amount: 25 });
  }

  if (addJacket) {
    august15Items.push({ name: "Jacket Optional (Remaining)", amount: 65 });
  }

  const augustTotal = august15Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "August 15",
    label: "📅 Mid-Term Installment",
    amount: augustTotal,
    items: august15Items,
  });

  // 3. September 15 Milestone
  const september15Items: MilestoneItem[] = [];
  if (packageId === "langston-taylor" || packageId === "leonard-morse") {
    september15Items.push({ name: "Hospitality Suite", amount: 40 });
    september15Items.push({ name: "Tailgate", amount: 35 });
  }

  const septemberTotal = september15Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "September 15",
    label: "📅 Pre-Event Installment",
    amount: septemberTotal,
    items: september15Items,
  });

  // 4. October 15 Milestone
  const october15Items: MilestoneItem[] = [];
  if (packageId === "langston-taylor" || packageId === "leonard-morse") {
    october15Items.push({ name: "Chapter Donation", amount: 25 });
  }

  const octoberTotal = october15Items.reduce((sum, item) => sum + item.amount, 0);

  milestones.push({
    date: "October 15",
    label: "📅 Final Settlement Balance",
    amount: octoberTotal,
    items: october15Items,
  });

  return milestones;
}
