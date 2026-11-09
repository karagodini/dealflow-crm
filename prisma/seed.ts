import {
  PrismaClient,
  type InvoiceStatus,
  type TaskPriority,
  type TaskStatus,
} from "@prisma/client";

import { hashPassword } from "../src/lib/password";
import { DEFAULT_STAGES } from "../src/lib/stages";

const prisma = new PrismaClient();

const password = "Harborpine#2026";

function atNoon(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12));
}

function daysFromToday(days: number) {
  const now = new Date();
  return atNoon(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days);
}

function monthsAgo(months: number, day = 14) {
  const now = new Date();
  return atNoon(now.getUTCFullYear(), now.getUTCMonth() - months, day);
}

async function main() {
  await prisma.workspace.deleteMany({ where: { slug: "harbor-and-pine" } });
  await prisma.user.deleteMany({
    where: { email: { in: ["mara@harborandpine.studio", "jonah@harborandpine.studio"] } },
  });

  const passwordHash = await hashPassword(password);
  const mara = await prisma.user.create({
    data: { name: "Mara Ellison", email: "mara@harborandpine.studio", passwordHash },
  });
  const jonah = await prisma.user.create({
    data: { name: "Jonah Reeves", email: "jonah@harborandpine.studio", passwordHash },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Harbor & Pine",
      slug: "harbor-and-pine",
      currency: "USD",
      invoicePrefix: "INV",
      nextInvoiceNumber: 1100,
      members: {
        create: [
          { userId: mara.id, role: "OWNER" },
          { userId: jonah.id, role: "MEMBER" },
        ],
      },
      stages: {
        create: DEFAULT_STAGES.map((stage, position) => ({
          name: stage.name,
          color: stage.color,
          isWon: stage.isWon,
          isLost: stage.isLost,
          position,
        })),
      },
    },
    include: { stages: true },
  });

  const stage = Object.fromEntries(workspace.stages.map((item) => [item.name, item.id]));

  const clients = {
    linden: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Linden Bakery",
        company: "Linden Bakery",
        email: "elena@lindenbakery.com",
        phone: "+1 503 555 0148",
        website: "https://lindenbakery.com",
        status: "ACTIVE",
        contacts: {
          create: {
            name: "Elena Voss",
            title: "Owner",
            email: "elena@lindenbakery.com",
            phone: "+1 503 555 0148",
          },
        },
      },
    }),
    calder: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Calder Architects",
        company: "Calder Architects",
        email: "priya@calderarchitects.com",
        website: "https://calderarchitects.com",
        status: "ACTIVE",
        contacts: {
          create: { name: "Priya Raman", title: "Principal", email: "priya@calderarchitects.com" },
        },
      },
    }),
    northwind: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Northwind Goods",
        company: "Northwind Goods",
        email: "samir@northwindgoods.com",
        website: "https://northwindgoods.com",
        status: "ACTIVE",
        contacts: {
          create: { name: "Samir Adeyemi", title: "Founder", email: "samir@northwindgoods.com" },
        },
      },
    }),
    fieldnote: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Fieldnote Journal",
        company: "Fieldnote Journal",
        email: "helen@fieldnotejournal.com",
        status: "LEAD",
        contacts: {
          create: { name: "Helen Cho", title: "Editor", email: "helen@fieldnotejournal.com" },
        },
      },
    }),
    marlowe: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Marlowe Coffee Roasters",
        company: "Marlowe Coffee Roasters",
        email: "owen@marlowecoffee.com",
        website: "https://marlowecoffee.com",
        status: "ACTIVE",
        contacts: {
          create: { name: "Owen Marlowe", title: "Roaster", email: "owen@marlowecoffee.com" },
        },
      },
    }),
    sable: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Sable Dental",
        company: "Sable Dental",
        email: "anika@sabledental.com",
        status: "INACTIVE",
        contacts: {
          create: { name: "Dr. Anika Shah", title: "Director", email: "anika@sabledental.com" },
        },
      },
    }),
    brightline: await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: "Brightline Civic",
        company: "Brightline Civic",
        email: "nora@brightlinecivic.org",
        status: "LEAD",
        contacts: {
          create: {
            name: "Nora Petrov",
            title: "Communications",
            email: "nora@brightlinecivic.org",
          },
        },
      },
    }),
  };

  await prisma.note.createMany({
    data: [
      {
        clientId: clients.linden.id,
        authorId: mara.id,
        body: "Elena wants the seasonal menu and weekend preorders live before the holiday rush. Photography is already shot.",
        createdAt: daysFromToday(-12),
      },
      {
        clientId: clients.linden.id,
        authorId: jonah.id,
        body: "Homepage direction: warm paper, one serif headline, and the pastry case above the fold.",
        createdAt: daysFromToday(-6),
      },
      {
        clientId: clients.calder.id,
        authorId: mara.id,
        body: "Priya asked for a project index that can be filtered by typology. Holding the fee until the sitemap is signed.",
        createdAt: daysFromToday(-4),
      },
      {
        clientId: clients.northwind.id,
        authorId: mara.id,
        body: "Catalog migration launched. They kept us on a small monthly care plan.",
        createdAt: daysFromToday(-20),
      },
      {
        clientId: clients.fieldnote.id,
        authorId: jonah.id,
        body: "Helen is comparing us with a magazine studio in Chicago. She cares more about reading rhythm than features.",
        createdAt: daysFromToday(-2),
      },
    ],
  });

  const deals = {
    linden: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.linden.id,
        stageId: stage.Proposal!,
        ownerId: mara.id,
        title: "Seasonal site and ordering",
        valueCents: 1840000,
        expectedClose: daysFromToday(18),
        description: "Marketing site plus a weekend preorder flow for the bakery case.",
        position: 0,
      },
    }),
    calder: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.calder.id,
        stageId: stage.Negotiation!,
        ownerId: mara.id,
        title: "Practice site and project index",
        valueCents: 3200000,
        expectedClose: daysFromToday(11),
        description: "A quiet site for the practice, with a filterable project index.",
        position: 0,
      },
    }),
    northwind: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.northwind.id,
        stageId: stage.Won!,
        ownerId: jonah.id,
        title: "Catalog migration",
        valueCents: 2450000,
        closedAt: monthsAgo(2, 8),
        position: 0,
      },
    }),
    fieldnote: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.fieldnote.id,
        stageId: stage.Qualified!,
        ownerId: jonah.id,
        title: "Issue template and subscription",
        valueCents: 980000,
        expectedClose: daysFromToday(30),
        position: 0,
      },
    }),
    marlowe: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.marlowe.id,
        stageId: stage.Lead!,
        ownerId: mara.id,
        title: "Wholesale ordering",
        valueCents: 1420000,
        position: 0,
      },
    }),
    sable: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.sable.id,
        stageId: stage.Lost!,
        ownerId: mara.id,
        title: "Patient intake refresh",
        valueCents: 1100000,
        closedAt: monthsAgo(3, 3),
        description: "They stayed with their current vendor.",
        position: 0,
      },
    }),
    brightline: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.brightline.id,
        stageId: stage.Lead!,
        ownerId: jonah.id,
        title: "Annual report microsite",
        valueCents: 760000,
        position: 1,
      },
    }),
    calderWon: await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        clientId: clients.calder.id,
        stageId: stage.Won!,
        ownerId: mara.id,
        title: "Brand guidelines site",
        valueCents: 640000,
        closedAt: monthsAgo(4, 20),
        position: 1,
      },
    }),
  };

  async function invoice(input: {
    number: string;
    clientId: string;
    dealId?: string;
    status: InvoiceStatus;
    issue: Date;
    due: Date;
    paidAt?: Date;
    notes?: string;
    items: { description: string; quantity: number; unitPriceCents: number }[];
  }) {
    return prisma.invoice.create({
      data: {
        workspaceId: workspace.id,
        clientId: input.clientId,
        dealId: input.dealId,
        number: input.number,
        status: input.status,
        issueDate: input.issue,
        dueDate: input.due,
        paidAt: input.paidAt,
        notes: input.notes,
        items: {
          create: input.items.map((item, position) => ({ ...item, position })),
        },
      },
    });
  }

  await invoice({
    number: "INV-1041",
    clientId: clients.linden.id,
    status: "PAID",
    issue: monthsAgo(5, 6),
    due: monthsAgo(5, 20),
    paidAt: monthsAgo(5, 18),
    items: [{ description: "Menu photography page", quantity: 1, unitPriceCents: 320000 }],
  });
  await invoice({
    number: "INV-1044",
    clientId: clients.calder.id,
    dealId: deals.calderWon.id,
    status: "PAID",
    issue: monthsAgo(4, 2),
    due: monthsAgo(4, 16),
    paidAt: monthsAgo(4, 12),
    items: [
      { description: "Guidelines site design", quantity: 1, unitPriceCents: 280000 },
      { description: "Build and content entry", quantity: 1, unitPriceCents: 360000 },
    ],
  });
  await invoice({
    number: "INV-1051",
    clientId: clients.northwind.id,
    status: "PAID",
    issue: monthsAgo(3, 9),
    due: monthsAgo(3, 23),
    paidAt: monthsAgo(3, 19),
    items: [
      { description: "Catalog information architecture", quantity: 1, unitPriceCents: 860000 },
    ],
  });
  await invoice({
    number: "INV-1058",
    clientId: clients.northwind.id,
    dealId: deals.northwind.id,
    status: "PAID",
    issue: monthsAgo(2, 4),
    due: monthsAgo(2, 18),
    paidAt: monthsAgo(2, 11),
    items: [
      { description: "Storefront build", quantity: 1, unitPriceCents: 1590000 },
      { description: "Migration support", quantity: 12, unitPriceCents: 12500 },
    ],
  });
  await invoice({
    number: "INV-1066",
    clientId: clients.marlowe.id,
    status: "PAID",
    issue: monthsAgo(1, 8),
    due: monthsAgo(1, 22),
    paidAt: monthsAgo(1, 20),
    items: [{ description: "Wholesale discovery", quantity: 1, unitPriceCents: 240000 }],
  });
  await invoice({
    number: "INV-1072",
    clientId: clients.northwind.id,
    status: "PAID",
    issue: monthsAgo(0, 2),
    due: daysFromToday(12),
    paidAt: daysFromToday(-3),
    notes: "November care plan.",
    items: [{ description: "Monthly care", quantity: 1, unitPriceCents: 180000 }],
  });
  await invoice({
    number: "INV-1074",
    clientId: clients.marlowe.id,
    status: "SENT",
    issue: daysFromToday(-6),
    due: daysFromToday(10),
    items: [{ description: "Wholesale catalog deposit", quantity: 1, unitPriceCents: 400000 }],
  });
  await invoice({
    number: "INV-1075",
    clientId: clients.calder.id,
    dealId: deals.calder.id,
    status: "SENT",
    issue: daysFromToday(-20),
    due: daysFromToday(-8),
    notes: "Progress billing for the project index.",
    items: [{ description: "Project index, progress", quantity: 1, unitPriceCents: 800000 }],
  });
  await invoice({
    number: "INV-1076",
    clientId: clients.fieldnote.id,
    status: "DRAFT",
    issue: daysFromToday(0),
    due: daysFromToday(21),
    items: [{ description: "Editorial discovery", quantity: 2, unitPriceCents: 120000 }],
  });

  async function task(input: {
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    due?: Date;
    clientId?: string;
    dealId?: string;
    assigneeId?: string;
    completedAt?: Date;
  }) {
    return prisma.task.create({
      data: {
        workspaceId: workspace.id,
        title: input.title,
        status: input.status,
        priority: input.priority,
        dueDate: input.due,
        clientId: input.clientId,
        dealId: input.dealId,
        assigneeId: input.assigneeId,
        completedAt: input.completedAt,
      },
    });
  }

  await task({
    title: "Send Calder the revised sitemap",
    status: "OPEN",
    priority: "HIGH",
    due: daysFromToday(1),
    clientId: clients.calder.id,
    dealId: deals.calder.id,
    assigneeId: mara.id,
  });
  await task({
    title: "Collect Marlowe product photography",
    status: "IN_PROGRESS",
    priority: "NORMAL",
    due: daysFromToday(5),
    clientId: clients.marlowe.id,
    assigneeId: jonah.id,
  });
  await task({
    title: "Write the Fieldnote proposal",
    status: "OPEN",
    priority: "HIGH",
    due: daysFromToday(-1),
    clientId: clients.fieldnote.id,
    dealId: deals.fieldnote.id,
    assigneeId: mara.id,
  });
  await task({
    title: "Northwind launch checklist",
    status: "DONE",
    priority: "NORMAL",
    due: daysFromToday(-18),
    completedAt: daysFromToday(-16),
    clientId: clients.northwind.id,
    assigneeId: jonah.id,
  });

  const events: { summary: string; type: string; createdAt: Date; actorId?: string }[] = [
    {
      summary: "Mara Ellison added Linden Bakery.",
      type: "client.created",
      createdAt: daysFromToday(-40),
      actorId: mara.id,
    },
    {
      summary: "Mara Ellison opened “Seasonal site and ordering” with Linden Bakery.",
      type: "deal.created",
      createdAt: daysFromToday(-21),
      actorId: mara.id,
    },
    {
      summary: "Mara Ellison moved “Practice site and project index” from Proposal to Negotiation.",
      type: "deal.moved",
      createdAt: daysFromToday(-5),
      actorId: mara.id,
    },
    {
      summary: "Jonah Reeves finished “Northwind launch checklist”.",
      type: "task.updated",
      createdAt: daysFromToday(-16),
      actorId: jonah.id,
    },
    {
      summary: "Mara Ellison marked INV-1072 paid.",
      type: "invoice.status",
      createdAt: daysFromToday(-3),
      actorId: mara.id,
    },
    {
      summary: "Mara Ellison noted something on Calder Architects.",
      type: "note.added",
      createdAt: daysFromToday(-4),
      actorId: mara.id,
    },
  ];
  await prisma.activity.createMany({
    data: events.map((event) => ({ ...event, workspaceId: workspace.id })),
  });

  console.log("Seeded Harbor & Pine.");
  console.log("Mara Ellison  mara@harborandpine.studio");
  console.log("Jonah Reeves  jonah@harborandpine.studio");
  console.log(`Password      ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
