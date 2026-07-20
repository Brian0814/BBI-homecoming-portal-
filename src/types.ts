export interface PackageOption {
  id: string;
  name: string;
  price: number;
  items: string[];
  note?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface OrderForm {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ShippingAddress;
  shirtSize: string;
  specialRequests: string;
  selectedPackageId: string;
  // Optional Add-ons
  addFootballTicket: boolean;
  addDetroitJacket: boolean;
  // Jacket Customization Details
  jacketSize: string;
  jacketCrossingYear: string;
  jacketLineName: string;
  jacketEntireLineName: string;
  jacketLineNumber: string;
}

export const SHIRT_SIZES = [
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"
];

export const PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: "langston-taylor",
    name: "A. Langston Taylor Alumni Package",
    price: 250,
    items: [
      "BBI Homecoming Box (Custom T-shirt & Exclusive Merch)",
      "Full Event Access (Brotherhood Event & Sigma Hospitality Suite)",
      "Stepshow Ticket Included",
      "Tailgate Food Included",
      "Chapter Donation Included"
    ],
    note: "The Complete Homecoming Experience. All packages require a $100 deposit to secure."
  },
  {
    id: "leonard-morse",
    name: "Leonard F. Morse Alumni Package",
    price: 230,
    items: [
      "BBI Homecoming Box (Custom T-shirt & Exclusive Merch)",
      "Full Event Access (Brotherhood Event & Sigma Hospitality Suite)",
      "Tailgate Food Included",
      "Chapter Donation Included"
    ],
    note: "Hospitality & Brotherhood Focus. All packages require a $100 deposit to secure."
  },
  {
    id: "charles-brown",
    name: "Charles I. Brown Undergrad Package",
    price: 110,
    items: [
      "BBI Homecoming Box (Custom T-shirt & Exclusive Merch)",
      "Full Event Access (Brotherhood Event & Sigma Hospitality Suite)",
      "Tailgate Food Included",
      "Chapter Donation Included"
    ],
    note: "For the Active Collegiate Brothers. Note: Stepshow tickets must be purchased on-campus with student discount."
  },
  {
    id: "box-items",
    name: "BBI Brotherhood Box Only",
    price: 125,
    items: [
      "BBI Homecoming Box (Custom T-shirt & Exclusive Merch)",
      "Chapter Donation Included"
    ],
    note: "Can't make it? Support the chapter from afar. Plus shipping costs apply."
  },
  {
    id: "jacket-only",
    name: "Custom Detroit Jacket Only (No Reunion Package)",
    price: 0,
    items: [
      "Custom Carhartt-Style Detroit Jacket ($135 value)",
      "Excludes BBI Homecoming Box (No T-shirt or Merch)",
      "Excludes Full Event Access & Stepshow Tickets",
      "Excludes Tailgate Food & Chapter Donation"
    ],
    note: "Select this option if you ONLY want to order the customized Detroit Jacket. Total cost is $135 (paid via installments)."
  }
];

export const STATE_LIST = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];
