// ============================================================
// SITE CONTENT
// Copy and figures come from luckypetroleum.pk (copied 20 Nov 2026).
// Fuel rates change often: update `fuelPrices` before launch.
// ============================================================

export const site = {
  name: "Lucky Petroleum",
  legalName: "Lucky Petroleum Pvt. Limited",
  description:
    "Founded in 2003, Lucky Petroleum is one of Pakistan’s leading oil marketing companies, supplying petroleum and petrochemical products across the country.",
  address: "Suite No. 308, The Forum, G-20, Block-9, Clifton, Karachi",
  email: "info@luckypetroleum.pk",
  phones: [
    { label: "Customer support", value: "+92 334 7266695", href: "tel:+923347266695" },
    { label: "Office", value: "021-35300031-35" },
  ],
  whatsappUrl: "https://wa.me/923347266695",
  social: {
    facebook: "https://www.facebook.com/LuckyPetroleumOMC/",
    linkedin: "https://www.linkedin.com/company/luckypetroleum/",
  },
  companyProfileUrl:
    "https://luckypetroleum.pk/wp-content/uploads/2025/07/Lucky-Petroleum-Company-Profile-V13-pages.pdf",
  dealerFormUrl: "https://luckypetroleum.pk/wp-content/uploads/2025/06/Dealer-Application-Form-1.pdf",
};

export const navLinks = [
  { href: "#about", label: "About Us" },
  { href: "#prices", label: "Fuel Prices" },
  { href: "#services", label: "Services" },
  { href: "#depots", label: "Projects" },
  { href: "#customers", label: "Customers" },
  { href: "#sustainability", label: "Sustainability" },
  { href: "#careers", label: "Careers" },
];

export const hero = {
  eyebrow: "Petroleum and petrochemical products",
  titleLines: ["Ensuring quality", "at every", "step."],
  text: "Founded in 2003, Lucky Petroleum has grown from a small family-run enterprise into one of Pakistan’s leading oil marketing companies.",
  primaryCta: { label: "Fuel prices", href: "#prices" },
  secondaryCta: { label: "Contact us", href: "#contact" },
};

export const about = {
  title: "About Lucky Petroleum",
  caption: "Began as Lucky Oil",
  paragraphs: [
    "Founded in 2003, Lucky Petroleum has grown from a small family-run enterprise into one of Pakistan’s leading oil marketing companies. What began as a modest operation under the name Lucky Oil has now become a trusted provider of petroleum and petrochemical products across the country, with a strong reputation for quality, reliability, and customer service.",
    "Our journey has been fueled by a commitment to supporting businesses of all sizes, delivering high-quality petroleum products to meet their operational needs. In 2023, we reached a major milestone by transitioning into the mainstream oil industry. Acquiring an Oil Marketing License from the Oil and Gas Regulatory Authority (OGRA) of Pakistan, we rebranded as Lucky Petroleum Pvt. Limited, positioning ourselves to better serve our growing customer base.",
  ],
  mission: {
    title: "Mission",
    text: "Our mission is to empower businesses and communities by providing top-quality petroleum products that ensure operational continuity and efficiency. With a customer-centric approach, we strive to exceed expectations, foster growth, and contribute to the energy needs of Pakistan with unwavering commitment to quality and service.",
  },
  vision: {
    title: "Vision",
    text: "To become a leading force in the energy sector by consistently delivering innovative, efficient, and superior-quality petroleum products, while setting the benchmark for operational excellence and reliability across Pakistan.",
  },
};

// Unit assumed to be rupees per litre; confirm with the client before launch.
export const fuelPrices = {
  title: "Fuel Prices",
  currency: "Rs.",
  unit: "litre",
  note: "Prices may change. Contact us for the latest rates.",
  items: [
    { code: "petrol", name: "Petrol", value: 377.71 },
    { code: "diesel", name: "Diesel", value: 391.75 },
    { code: "hobc", name: "HOBC", value: 350 },
  ],
};

export const stats = [
  { value: 150, suffix: "+", label: "Employees" },
  { value: 17, suffix: "+", label: "Fuel stations" },
  { value: 2, suffix: "+", label: "Storage facilities" },
  { value: 5, suffix: "+", label: "Upcoming projects" },
];

export const journey = {
  title: "Our Journey",
  items: [
    {
      year: "2003",
      title: "Family-run beginnings",
      text: "What began as a modest operation under the name Lucky Oil.",
    },
    {
      year: "2023",
      title: "Licensed oil marketer",
      text: "Acquired an Oil Marketing License from OGRA and rebranded as Lucky Petroleum Pvt. Limited.",
    },
    {
      year: "Phase 1",
      title: "Retail expansion",
      text: "Launching 60 retail outlets in Sindh, offering fuel solutions with modern facilities.",
    },
    {
      year: "Network",
      title: "Storage and terminals",
      text: "Bulk storage at Kemari Oil Terminal in Karachi, depots in Daulatpur and Sahiwal, and a depot under construction in Kohat.",
    },
  ],
};

export const ceoMessage = {
  label: "CEO’s message",
  quote:
    "We treat our employees, business partners, and customers as part of our extended family, grounded in trust, integrity, and mutual respect.",
  name: "Nasim Aqsar Abbasi",
  role: "CEO, LPPL",
};

export const services = [
  {
    title: "Lucky Fuels",
    quote: "Ensuring Quality at Every Step",
    text: "At Lucky Petroleum, we play a dynamic role in developing high-quality fuels that meet the demands of today and tomorrow. Since 2003 we have been committed to producing fuels that exceed industry standards.",
    detail:
      "Our state-of-the-art depots are equipped to ensure the quality and integrity of our products, guaranteeing that only the best reaches our customers.",
  },
  {
    title: "Lucky Lubricants",
    quote: "Innovative Lubricants for Every Need",
    text: "Our LP Oils are formulated to meet the demands of modern automotive technologies, ensuring unmatched performance and reliability. Whether for industrial or automotive use, our lubricants are crafted to keep your engine running smoothly and efficiently for longer.",
    detail:
      "Zero Deposits, Maximum Power. Our lubricants are engineered to minimize deposits, ensuring your engine remains strong and efficient for years to come.",
  },
  {
    title: "Logistics",
    quote: "Powering Efficient Fuel Transport",
    text: "Our logistics network is the backbone of our operations. With a dedicated fleet of fuel transport vehicles, we ensure that fuel reaches every corner of Pakistan with safety, speed, and precision.",
    detail:
      "Our logistics system is designed to meet the growing demands of the energy sector, ensuring timely deliveries while adhering to the highest safety and environmental standards.",
  },
];

export const depotsSection = {
  title: "Terminals & Depots",
  intro:
    "Built to international standards and adhering to proven industrial practices, our depots ensure safety, asset integrity, and operational excellence.",
  items: [
    {
      name: "Daulatpur Depot",
      location: "District Benazirabad",
      status: "Flagship depot",
      capacityLabel: "Total capacity",
      capacityMt: 4200,
      split: [
        { code: "HSD", label: "HSD (High-Speed Diesel)", mt: 2100 },
        { code: "PMG", label: "PMG (Motor Gasoline)", mt: 2100 },
      ],
      text: "Equipped with advanced storage tanks for High-Speed Diesel (HSD) and Motor Gasoline (PMG), ensuring a reliable supply for our customers.",
    },
    {
      name: "Sahiwal Depot",
      location: "Punjab",
      status: "Fully operational",
      capacityLabel: "Total storage capacity",
      capacityMt: 8892,
      split: [
        { code: "HSD", label: "HSD (High-Speed Diesel)", mt: 4492 },
        { code: "PMG", label: "PMG (Premium Motor Gasoline)", mt: 4400 },
      ],
      text: "Strengthens our regional supply infrastructure by supporting reliable fuel availability and efficient distribution.",
    },
    {
      name: "Kohat Depot",
      location: "Khyber Pakhtunkhwa",
      status: "Under construction",
      capacityLabel: "Planned storage capacity",
      capacityMt: 3000,
      split: null,
      text: "Designed to handle High-Speed Diesel (HSD) and Motor Gasoline (PMG), strengthening fuel storage and distribution across the region.",
    },
  ],
  future:
    "Our upcoming terminals will be designed to meet business challenges with safe, efficient, and smooth operations. We also plan to offer hospitality services to other OMCs at our future terminals.",
};

export const customers = {
  title: "Business Customers",
  intro: "We proudly serve a diverse portfolio of clients from multiple sectors:",
  sectors: [
    "Banking and financial institutions",
    "Real estate and construction companies",
    "Healthcare facilities and hospitals",
    "Top educational institutions",
    "Prominent textile and manufacturing units",
    "Leading logistics and courier services",
  ],
};

export const retail = {
  eyebrow: "Beyond fueling",
  title: "Retail Outlets",
  intro:
    "At Lucky Petroleum, we believe that the customer experience should go beyond just refueling. Our retail outlets are designed to provide a seamless and convenient stop for all your needs, ensuring that every visit is quick, efficient, and satisfying.",
  highlights: [
    {
      title: "One stop, many solutions",
      quote: "Our retail outlets are more than just fuel stations.",
      text: "Visit our on-site marts to enjoy a wide selection of groceries, essentials, and refreshments for your journey.",
    },
    {
      title: "Car wash services",
      quote: "Quick, Efficient, and Spotless",
    },
    {
      title: "Tyre care services",
      quote: "Keeping You Safe on the Road",
      text: "Our Tyre Zones are equipped with cutting-edge machinery and staffed by highly trained professionals. From balancing to pressure checks, we keep your tyres in top condition.",
    },
  ],
  dealerCta: "Dealer application form",
};

export const sustainability = {
  title: "Sustainability at Lucky Petroleum",
  intro:
    "At Lucky Petroleum, sustainability is at the heart of everything we do. As an ethical corporate citizen, we are committed to balancing economic growth with environmental and social responsibility. Our goal is to contribute positively to the planet by promoting technologies and practices that protect health, safety, and the environment.",
  items: [
    {
      title: "A commitment to balance",
      text: "We believe sustainability is essential for maintaining the delicate ecosystems that support life on Earth. We have developed skills and practices that foster environmental awareness and responsibility in all of our business activities.",
    },
    {
      title: "Safety matters",
      text: "At Lucky Petroleum, safety is at the core of our operations. We prioritize personal, operational, local, and environmental safety. Our primary objective is to guarantee zero harm: protecting people, preserving the environment, and preventing any disruption in our processes.",
    },
  ],
};

export const careers = {
  title: "Drive Your Future With Lucky Petroleum",
  text: "At Lucky Petroleum, we believe our people are the fuel behind our success. Whether you’re a seasoned professional or just starting your career, we offer a dynamic and supportive environment where talent thrives, ideas matter, and growth is continuous.",
  cta: "View careers",
  url: "https://luckypetroleum.pk/careers/",
};

export const media = {
  title: "Brand Film",
};

export const contact = {
  title: "Have an Issue or Message for Us?",
  text: "We’re here to help! If you’re facing any issues or have feedback, feel free to get in touch. Our team will respond as soon as possible.",
  messageLimit: 180,
};
