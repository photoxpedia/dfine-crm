import { PrismaClient, ProjectType, UnitOfMeasure, LeadStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Default password for test users
const DEFAULT_PASSWORD = 'password123';

// Default lead sources
const defaultLeadSources = [
  { name: 'Phone Call', sortOrder: 0 },
  { name: 'Walk-in', sortOrder: 1 },
  { name: 'Website', sortOrder: 2 },
  { name: 'Referral', sortOrder: 3 },
  { name: 'Social Media', sortOrder: 4 },
  { name: 'Home Show/Event', sortOrder: 5 },
  { name: 'Other', sortOrder: 6 },
];

// Bathroom pricing data from the spreadsheet
const bathroomCategories = [
  {
    name: 'Basic Bathroom Labor',
    items: [
      { name: 'POWDER ROOM LABOR - SMALL', unit: 'EA', contractor: 2250, selling: 3937.50 },
      { name: 'POWDER ROOM LABOR - LARGE', unit: 'EA', contractor: 3000, selling: 5250 },
      { name: '5 X 8 BATHROOM WITH TUB LABOR', unit: 'EA', contractor: 6500, selling: 11375 },
      { name: '5 X 8 BATHROOM CONVERT TO SHOWER LABOR', unit: 'EA', contractor: 7500, selling: 13125 },
      { name: 'MASTER BATH SMALL SHOWER ONLY', unit: 'EA', contractor: 8500, selling: 14875 },
      { name: 'LARGE MASTER BATHROOM SHOWER ONLY', unit: 'EA', contractor: 9500, selling: 16625 },
      { name: 'LARGE MASTER BATHROOM SHOWER AND TUB', unit: 'EA', contractor: 11000, selling: 19250 },
      { name: 'EXTRA LARGE MASTER BATHROOM - TUB & SHOWER', unit: 'EA', contractor: 12500, selling: 21875 },
    ],
  },
  {
    name: 'Carpentry / General Construction',
    items: [
      { name: 'TEAR OUT AND REPLACE DRYWALL - SMALL JOB', unit: 'EA', contractor: 700, selling: 1225 },
      { name: 'TEAR OUT AND REPLACE DRYWALL - MEDIUM JOB', unit: 'EA', contractor: 900, selling: 1575 },
      { name: 'TEAR OUT AND REPLACE DRYWALL - LARGE JOB', unit: 'EA', contractor: 1200, selling: 2100 },
      { name: 'DEMO WALL UP TO 3 FT INCLUDES DRYWALL REPAIR', unit: 'LF', contractor: 150, selling: 262.50 },
      { name: 'DEMO WALL MORE THAN 3 FT - INCLUDES DRYWALL', unit: 'LF', contractor: 450, selling: 787.50 },
      { name: 'DEMO LOAD BEARING WALL & INCLUDES CEILING SUPPORT BEAM', unit: 'EA', contractor: 3000, selling: 5250 },
      { name: 'REPAIR/REPLACE SUB FLOOR OR UNDERLAYMENT', unit: 'SF', contractor: 3, selling: 5.25 },
      { name: 'METAL THRESHOLD', unit: 'EA', contractor: 16.25, selling: 28.44 },
      { name: 'FRAME AND INSTALL NEW POCKET DOOR', unit: 'EA', contractor: 700, selling: 1225 },
      { name: 'INSTALL BARN DOOR WITH HARDWARE - LABOR ONLY', unit: 'EA', contractor: 150, selling: 262.50 },
      { name: 'INSTALL STANDARD DOOR WITH FRAME/TRIM', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'INSTALL NEW DRYWALL - SMALL BATHROOM', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'INSTALL NEW DRYWALL - MEDIUM BATHROOM', unit: 'EA', contractor: 700, selling: 1225 },
      { name: 'INSTALL NEW DRYWALL - LARGE BATHROOM', unit: 'EA', contractor: 900, selling: 1575 },
      { name: 'DEMO AND REPLACE WINDOW - LABOR ONLY', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'FRAME FOR NEW WALL - PER LF', unit: 'LF', contractor: 100, selling: 175 },
      { name: 'FRAME FOR KNEE WALL - PER LF', unit: 'LF', contractor: 65, selling: 113.75 },
      { name: 'FRAME FOR SHOWER BENCH', unit: 'EA', contractor: 225, selling: 393.75 },
      { name: 'FRAME FOR NICHE', unit: 'EA', contractor: 150, selling: 262.50 },
    ],
  },
  {
    name: 'HVAC',
    items: [
      { name: 'RUN NEW DUCT WORK OUTSIDE', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'RELOCATE FLOOR VENT TO WALL', unit: 'EA', contractor: 200, selling: 350 },
      { name: 'RELOCATE CEILING AC/HEAT VENT', unit: 'EA', contractor: 175, selling: 306.25 },
      { name: 'RELOCATE VENT TO TOE KICK', unit: 'EA', contractor: 175, selling: 306.25 },
    ],
  },
  {
    name: 'Additional Plumbing Work',
    items: [
      { name: 'RELOCATE SINK/SHOWER/TUB/TOILET - SAME WALL', unit: 'EA', contractor: 300, selling: 525 },
      { name: 'RELOCATE SINK/SHOWER/TUB/TOILET - OTHER LOCATION', unit: 'EA', contractor: 500, selling: 875 },
      { name: 'RELOCATE HOT/COLD WATER SUPPLIES ONLY', unit: 'EA', contractor: 250, selling: 437.50 },
      { name: 'RELOCATE / ADD NEW VENT PIPE', unit: 'EA', contractor: 350, selling: 612.50 },
      { name: 'EXTRA PLUMBING FOR RAIN SHOWER / HANDHELD WITH VALVE', unit: 'EA', contractor: 200, selling: 350 },
      { name: 'ADD NEW PLUMBING ROUGH IN (LESS THAN 6 FT)', unit: 'EA', contractor: 525, selling: 918.75 },
      { name: 'ADD NEW PLUMBING ROUGH IN (MORE THAN 6 FT)', unit: 'EA', contractor: 1000, selling: 1750 },
      { name: 'INSTALL NEW TOILET ONLY', unit: 'EA', contractor: 250, selling: 437.50 },
      { name: 'INSTALL NEW TUB ONLY', unit: 'EA', contractor: 500, selling: 875 },
      { name: 'INSTALL WHIRLPOOL TUB OR WALK IN STYLE TUB', unit: 'EA', contractor: 550, selling: 962.50 },
      { name: 'INSTALL SHOWER FIXTURES ONLY', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'INSTALL SINK PLUMBING ONLY', unit: 'EA', contractor: 250, selling: 437.50 },
      { name: 'ADDITIONAL PLUMBING WORK - PER HOUR', unit: 'EA', contractor: 125, selling: 218.75 },
      { name: 'LICENSED PLUMBER - PER HOUR', unit: 'EA', contractor: 250, selling: 437.50 },
    ],
  },
  {
    name: 'Electrical Work',
    items: [
      { name: 'RELOCATE LIGHT BOX OVER MIRROR', unit: 'EA', contractor: 125, selling: 218.75 },
      { name: 'RELOCATE EXHAUST FAN - CEILING', unit: 'EA', contractor: 300, selling: 525 },
      { name: 'RUN NEW ELECTRICAL TO NEW EXHAUST FAN WITH SWITCH', unit: 'EA', contractor: 150, selling: 262.50 },
      { name: 'INSTALL NEW RECESS LIGHT WITH SWITCH', unit: 'EA', contractor: 150, selling: 262.50 },
      { name: 'REPLACE EXISTING LIGHT WITH RECESS LIGHT', unit: 'EA', contractor: 100, selling: 175 },
      { name: 'RUN NEW DEDICATED LINE UP TO 25 FT', unit: 'EA', contractor: 350, selling: 612.50 },
      { name: 'RUN NEW DEDICATED LINE UP TO 40 FT', unit: 'EA', contractor: 450, selling: 787.50 },
      { name: 'RELOCATE / ADD OUTLET/SWITCH WITHIN 5 FT', unit: 'EA', contractor: 85, selling: 148.75 },
      { name: 'RELOCATE / ADD OUTLET/SWITCH WITHIN 10 FT', unit: 'EA', contractor: 125, selling: 218.75 },
      { name: 'ELIMINATE OUTLET/SWITCH', unit: 'EA', contractor: 25, selling: 43.75 },
      { name: 'REPLACE EXISTING OUTLET/SWITCH', unit: 'EA', contractor: 30, selling: 52.50 },
      { name: 'REMOVE AND INSTALL WALL HEATER', unit: 'EA', contractor: 175, selling: 306.25 },
      { name: 'OTHER LIGHT FIXTURE WITH SWITCH', unit: 'EA', contractor: 125, selling: 218.75 },
      { name: 'LICENSED ELECTRICIAN PER HOUR', unit: 'EA', contractor: 150, selling: 262.50 },
      { name: 'HEATED FLOORS - PER SQ FT', unit: 'SF', contractor: 15, selling: 26.25 },
    ],
  },
  {
    name: 'Cabinets',
    items: [
      { name: 'VANITY CABINET COST', unit: 'EA', contractor: 590, selling: 1032.50 },
      { name: 'VANITY MATCHING MIRROR FROM MANUFACTURER', unit: 'EA', contractor: 0, selling: 0 },
      { name: 'ADDITIONAL SHELVES', unit: 'EA', contractor: 0, selling: 0 },
      { name: 'OTHER CABINET ITEMS', unit: 'EA', contractor: 0, selling: 0 },
      { name: 'CABINET HARDWARE', unit: 'EA', contractor: 8, selling: 14 },
    ],
  },
  {
    name: 'Tiles',
    items: [
      { name: 'SHOWER PANELS', unit: 'SF', contractor: 0, selling: 0 },
      { name: 'FLOOR TILES', unit: 'SF', contractor: 2.99, selling: 5.23 },
      { name: 'DECO TILES', unit: 'SF', contractor: 15, selling: 26.25 },
      { name: 'SHOWER FLOOR TILES', unit: 'SF', contractor: 15, selling: 26.25 },
      { name: 'BULLNOSE TILES', unit: 'EA', contractor: 9, selling: 15.75 },
      { name: 'TILE BASE MOLDING - UPGRADED SKIRTING', unit: 'EA', contractor: 19, selling: 33.25 },
      { name: 'SCHLUTER', unit: 'PC', contractor: 23, selling: 40.25 },
      { name: 'GROUT SEAL', unit: 'EA', contractor: 25, selling: 43.75 },
      { name: 'CORNER SHAMPOO SHELVES', unit: 'EA', contractor: 35, selling: 61.25 },
      { name: 'GLASS SHOWER SHELVES', unit: 'EA', contractor: 50, selling: 87.50 },
      { name: 'GROUT AND OTHER TILE MATERIAL', unit: 'EA', contractor: 125, selling: 218.75 },
    ],
  },
  {
    name: 'Fixtures',
    items: [
      { name: 'STANDARD TUB - BASIC', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'SOAKING TUB', unit: 'EA', contractor: 950, selling: 1662.50 },
      { name: 'WHIRLPOOL / JETTED TUB', unit: 'EA', contractor: 1400, selling: 2450 },
      { name: 'FREE STANDING TUB', unit: 'EA', contractor: 1500, selling: 2625 },
      { name: 'DRAIN AND OVERFLOW KIT', unit: 'EA', contractor: 150, selling: 262.50 },
      { name: 'TOILET - STANDARD', unit: 'EA', contractor: 200, selling: 350 },
      { name: 'TOILET - MID-RANGE COMFORT HEIGHT', unit: 'EA', contractor: 400, selling: 700 },
      { name: 'TOILET - LUXURY', unit: 'EA', contractor: 750, selling: 1312.50 },
      { name: 'SOFT CLOSE TOILET SEAT', unit: 'EA', contractor: 55, selling: 96.25 },
      { name: 'SINK FAUCET - LOW', unit: 'EA', contractor: 100, selling: 175 },
      { name: 'SINK FAUCET - MEDIUM', unit: 'EA', contractor: 200, selling: 350 },
      { name: 'SINK FAUCET - HIGH', unit: 'EA', contractor: 300, selling: 525 },
      { name: 'SHOWER FAUCET - LOW', unit: 'EA', contractor: 200, selling: 350 },
      { name: 'SHOWER FAUCET - MEDIUM', unit: 'EA', contractor: 250, selling: 437.50 },
      { name: 'SHOWER FAUCET - HIGH', unit: 'EA', contractor: 300, selling: 525 },
      { name: 'SHOWER VALVE', unit: 'EA', contractor: 100, selling: 175 },
      { name: 'RAIN SHOWER HEAD AND ARM', unit: 'EA', contractor: 200, selling: 350 },
      { name: 'HANDHELD SHOWER HEAD WITH BAR', unit: 'EA', contractor: 300, selling: 525 },
      { name: 'EXHAUST FAN - 80 CFM', unit: 'EA', contractor: 85, selling: 148.75 },
      { name: 'EXHAUST FAN - 100 CFM', unit: 'EA', contractor: 125, selling: 218.75 },
      { name: 'EXHAUST FAN WITH LIGHT', unit: 'EA', contractor: 165, selling: 288.75 },
      { name: 'EXHAUST FAN WITH LIGHT AND HEATER', unit: 'EA', contractor: 265, selling: 463.75 },
      { name: 'VANITY LIGHT', unit: 'EA', contractor: 90, selling: 157.50 },
      { name: 'MEDICINE CABINET - HOME DEPOT', unit: 'EA', contractor: 100, selling: 175 },
      { name: 'MEDICINE CABINET - KOHLER OR BETTER', unit: 'EA', contractor: 300, selling: 525 },
      { name: 'DECORATIVE MIRROR', unit: 'EA', contractor: 250, selling: 437.50 },
      { name: 'TOWEL BAR', unit: 'EA', contractor: 55, selling: 96.25 },
      { name: 'TOILET TISSUE HOLDER', unit: 'EA', contractor: 40, selling: 70 },
      { name: 'TOWEL RING', unit: 'EA', contractor: 35, selling: 61.25 },
      { name: 'TOWEL HOOK', unit: 'EA', contractor: 21, selling: 36.75 },
      { name: 'FOLD OUT SEAT FOR SHOWER', unit: 'EA', contractor: 500, selling: 875 },
    ],
  },
  {
    name: 'Counter Top',
    items: [
      { name: 'ADDITIONAL SINK CUTOUT', unit: 'EA', contractor: 150, selling: 262.50 },
      { name: 'VANITY PROGRAM 26" GRANITE', unit: 'EA', contractor: 219, selling: 383.25 },
      { name: 'VANITY PROGRAM 32" GRANITE', unit: 'EA', contractor: 259, selling: 453.25 },
      { name: 'VANITY PROGRAM 38" GRANITE', unit: 'EA', contractor: 329, selling: 575.75 },
      { name: 'VANITY PROGRAM 50" GRANITE', unit: 'EA', contractor: 429, selling: 750.75 },
      { name: 'VANITY PROGRAM 62" GRANITE', unit: 'EA', contractor: 499, selling: 873.25 },
      { name: 'VANITY PROGRAM 75" GRANITE', unit: 'EA', contractor: 649, selling: 1135.75 },
      { name: 'GROUP 1 QUARTZ ($48-$60)', unit: 'SF', contractor: 60, selling: 105 },
      { name: 'GROUP 2 QUARTZ ($61-$80)', unit: 'SF', contractor: 80, selling: 140 },
      { name: 'GROUP 3 QUARTZ ($100-$114)', unit: 'SF', contractor: 114, selling: 199.50 },
      { name: 'UPGRADED EDGE DETAIL', unit: 'LF', contractor: 15, selling: 26.25 },
    ],
  },
  {
    name: 'Misc Items',
    items: [
      { name: 'SHOWER DOORS - STANDARD / BYPASS', unit: 'EA', contractor: 850, selling: 1487.50 },
      { name: 'SHOWER DOORS - 1 PANEL, 1 DOOR', unit: 'EA', contractor: 1700, selling: 2975 },
      { name: 'SHOWER DOORS - CUSTOM 2 PANELS, 1 DOOR', unit: 'EA', contractor: 2100, selling: 3675 },
      { name: 'SHOWER DOORS - CUSTOM 3 PANELS, 1 DOOR', unit: 'EA', contractor: 2500, selling: 4375 },
      { name: 'SUPPLY CUSTOM POCKET DOOR', unit: 'EA', contractor: 600, selling: 1050 },
      { name: 'SUPPLY BARN DOOR WITH HARDWARE', unit: 'EA', contractor: 500, selling: 875 },
      { name: 'SUPPLY NEW WINDOW - VINYL', unit: 'EA', contractor: 650, selling: 1137.50 },
      { name: 'PERMITS', unit: 'EA', contractor: 0, selling: 0 },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // Hash default password
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // Create organization first
  const organization = await prisma.organization.upsert({
    where: { slug: 'remodel-sync' },
    update: {},
    create: {
      name: 'ReModel Sync',
      slug: 'remodel-sync',
      email: 'info@remodelsync.com',
      phone: '(555) 123-4567',
      address: '123 Business Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    },
  });
  console.log('Created organization:', organization.name);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@remodelsync.com' },
    update: { passwordHash },
    create: {
      email: 'admin@remodelsync.com',
      name: 'Admin User',
      role: 'admin',
      passwordHash,
      isSuperAdmin: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // Create designer user
  const designer = await prisma.user.upsert({
    where: { email: 'designer@remodelsync.com' },
    update: { passwordHash },
    create: {
      email: 'designer@remodelsync.com',
      name: 'Tanya Designer',
      role: 'designer',
      passwordHash,
    },
  });
  console.log('Created designer user:', designer.email);
  console.log('Default password for all users:', DEFAULT_PASSWORD);

  // Add users to organization
  for (const user of [admin, designer]) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        userId: user.id,
        role: user.role === 'admin' ? 'owner' : 'member',
        isDefault: true,
      },
    });
  }
  console.log('Added users to organization');

  // Create default lead sources
  console.log('Creating default lead sources...');
  for (const source of defaultLeadSources) {
    await prisma.leadSource.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: source.name,
        },
      },
      update: { sortOrder: source.sortOrder },
      create: {
        organizationId: organization.id,
        name: source.name,
        sortOrder: source.sortOrder,
        isActive: true,
      },
    });
    console.log(`  Created lead source: ${source.name}`);
  }

  // Create bathroom pricing categories and items
  console.log('Creating bathroom pricing data...');

  // Check if pricing data already exists
  const existingCategories = await prisma.pricingCategory.count({
    where: { organizationId: organization.id },
  });
  if (existingCategories > 0) {
    console.log('  Pricing data already exists, skipping...');
  } else {
    for (let i = 0; i < bathroomCategories.length; i++) {
      const cat = bathroomCategories[i];

      const category = await prisma.pricingCategory.create({
        data: {
          organizationId: organization.id,
          name: cat.name,
          projectType: 'bathroom' as ProjectType,
          sortOrder: i,
          isActive: true,
        },
      });

      for (let j = 0; j < cat.items.length; j++) {
        const item = cat.items[j];
        await prisma.pricingItem.create({
          data: {
            categoryId: category.id,
            name: item.name,
            unitOfMeasure: (item.unit || 'EA') as UnitOfMeasure,
            contractorCost: item.contractor,
            sellingPrice: item.selling,
            sortOrder: j,
            isActive: true,
          },
        });
      }
      console.log(`  Created category: ${cat.name} with ${cat.items.length} items`);
    }
  }

  // Create notification templates
  const templates = [
    {
      name: 'magic_link',
      subject: 'Your Login Link - ReModel Sync',
      body: 'Click here to login: {{link}}',
    },
    {
      name: 'client_invite',
      subject: 'View Your Project - {{projectName}}',
      body: 'You have been invited to view your project. Click here: {{link}}',
    },
    {
      name: 'estimate_sent',
      subject: 'Your Estimate is Ready - {{projectName}}',
      body: 'Your estimate for {{projectName}} is ready for review.',
    },
    {
      name: 'payment_due',
      subject: 'Payment Due - {{projectName}}',
      body: 'A payment of {{amount}} is due for your project {{projectName}}.',
    },
    {
      name: 'payment_received',
      subject: 'Payment Received - {{projectName}}',
      body: 'We have received your payment of {{amount}} for {{projectName}}.',
    },
    {
      name: 'lead_assigned',
      subject: 'New Lead Assigned - {{leadName}}',
      body: 'You have been assigned a new lead: {{leadName}}. Project type: {{projectType}}.',
    },
    {
      name: 'followup_reminder',
      subject: 'Follow-up Reminder - {{leadName}}',
      body: 'You have a follow-up scheduled for {{leadName}} on {{date}}.',
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
  }
  console.log('Created notification templates');

  // Create sample leads with new status values
  const sampleLeads = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      address: '123 Main Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      source: 'Referral',
      status: 'contacted' as LeadStatus,
      projectType: 'bathroom' as ProjectType,
      notes: 'Interested in master bathroom remodel',
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 234-5678',
      address: '456 Oak Avenue',
      city: 'Austin',
      state: 'TX',
      zip: '78702',
      source: 'Website',
      status: 'new' as LeadStatus,
      projectType: 'kitchen' as ProjectType,
      notes: 'Looking for kitchen renovation quote',
    },
    {
      firstName: 'Michael',
      lastName: 'Williams',
      email: 'mwilliams@email.com',
      phone: '(555) 345-6789',
      address: '789 Pine Road',
      city: 'Round Rock',
      state: 'TX',
      zip: '78664',
      source: 'Referral',
      status: 'pre_estimate' as LeadStatus,
      subStatus: 'in_progress' as const,
      projectType: 'bathroom' as ProjectType,
      notes: 'Guest bathroom update, budget conscious',
    },
    {
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.d@email.com',
      phone: '(555) 456-7890',
      address: '101 Cedar Lane',
      city: 'Austin',
      state: 'TX',
      zip: '78703',
      source: 'Phone Call',
      status: 'on_hold' as LeadStatus,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      followUpReason: 'budget' as const,
      projectType: 'bathroom' as ProjectType,
      notes: 'Waiting on tax refund for budget',
    },
  ];

  console.log('Creating sample leads...');
  const createdLeads = [];
  for (const leadData of sampleLeads) {
    const existingLead = await prisma.lead.findFirst({
      where: {
        email: leadData.email,
        organizationId: organization.id,
      },
    });

    if (!existingLead) {
      const lead = await prisma.lead.create({
        data: {
          ...leadData,
          organizationId: organization.id,
          designerId: designer.id,
        },
      });
      createdLeads.push(lead);
      console.log(`  Created lead: ${lead.firstName} ${lead.lastName}`);

      // Create history entry for lead creation
      await prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          userId: designer.id,
          eventType: 'created',
          newValue: JSON.stringify({ status: lead.status }),
          note: 'Lead created (seed data)',
        },
      });
    } else {
      createdLeads.push(existingLead);
      console.log(`  Lead already exists: ${existingLead.firstName} ${existingLead.lastName}`);
    }
  }

  // Create sample projects from leads
  if (createdLeads.length >= 3) {
    const sampleProjects = [
      {
        name: 'Smith Master Bath Remodel',
        description: 'Complete master bathroom renovation including new tile, fixtures, and vanity',
        status: 'in_progress' as const,
        projectType: 'bathroom' as ProjectType,
        leadIndex: 0,
      },
      {
        name: 'Williams Guest Bath Update',
        description: 'Guest bathroom refresh with new fixtures and paint',
        status: 'pending_approval' as const,
        projectType: 'bathroom' as ProjectType,
        leadIndex: 2,
      },
    ];

    console.log('Creating sample projects...');
    for (const projectData of sampleProjects) {
      const lead = createdLeads[projectData.leadIndex];
      if (!lead) continue;

      const existingProject = await prisma.project.findFirst({
        where: { leadId: lead.id },
      });

      if (!existingProject) {
        const project = await prisma.project.create({
          data: {
            organizationId: organization.id,
            name: projectData.name,
            description: projectData.description,
            status: projectData.status,
            projectType: projectData.projectType,
            designerId: designer.id,
            leadId: lead.id,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
          },
        });
        console.log(`  Created project: ${project.name} (${project.id})`);

        // Create a sample estimate for the first project
        if (projectData.leadIndex === 0) {
          const estimate = await prisma.estimate.create({
            data: {
              projectId: project.id,
              version: 1,
              name: 'Initial Estimate',
              status: 'draft',
              marginPercentage: 40,
              subtotalContractor: 8500,
              subtotalSelling: 14875,
              total: 14875,
            },
          });
          console.log(`  Created estimate: ${estimate.name} for ${project.name}`);
        }
      }
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
