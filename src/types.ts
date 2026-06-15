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
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"
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
  }
];

export const STATE_LIST = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];
