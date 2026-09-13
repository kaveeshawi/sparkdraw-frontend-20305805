// The Team Member Portal previews HR features (attendance/leave/payroll/performance/
// expenses) that CLAUDE.md defers to the V3 commercial roadmap — there is no backend
// for any of this yet. This module generates stable, realistic-looking sample data
// per employee (seeded by id) so numbers don't jump around on every render/reload.

function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)]
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PROJECT_POOL = [
  { name: 'Avoora Mobile App', client: 'Avoora (Pvt) Ltd', color: '#802AEE' },
  { name: 'Brand Refresh', client: 'BrightFuture Inc', color: '#e11d48' },
  { name: 'Marketing Campaign', client: 'GreenLeaf Co', color: '#16a34a' },
  { name: 'NovaTech Website', client: 'NovaTech Ltd', color: '#0ea5e9' },
  { name: 'Social Kit', client: 'Bluewave Media', color: '#f59e0b' },
]

export function getPortalData(member) {
  const id = Number(member?.id) || 1
  const rand = seededRandom(id * 7919)

  const attendancePct = 88 + Math.floor(rand() * 11) // 88–98
  const present = 18 + Math.floor(rand() * 4)
  const late = Math.floor(rand() * 3)
  const absent = Math.floor(rand() * 2)
  const overtimeHours = 6 + Math.floor(rand() * 12)

  const weekAttendance = WEEKDAYS.map((day, i) => {
    if (i >= 5) return { day, status: 'weekend', hours: 0 }
    const r = rand()
    if (r > 0.92) return { day, status: 'absent', hours: 0 }
    if (r > 0.8) return { day, status: 'late', hours: 7.5 }
    return { day, status: 'present', hours: 8 + Math.round(rand() * 2 * 10) / 10 }
  })

  const liveRoll = rand()
  const liveStatus = liveRoll > 0.88
    ? { state: 'absent', label: 'Absent Today', detail: 'No check-in recorded' }
    : liveRoll > 0.78
      ? { state: 'clocked_out', label: 'Clocked Out', detail: 'Checked out at 06:15 PM' }
      : { state: 'clocked_in', label: 'Clocked In', detail: 'Since 09:02 AM' }

  const annualTotal = 14
  const annualUsed = 2 + Math.floor(rand() * 6)
  const casualTotal = 7
  const casualUsed = Math.floor(rand() * 4)
  const medicalTotal = 14
  const medicalUsed = Math.floor(rand() * 5)

  const projectCount = 2 + Math.floor(rand() * 3)
  const shuffled = [...PROJECT_POOL].sort(() => rand() - 0.5)
  const projects = shuffled.slice(0, projectCount).map((p, i) => {
    const progress = i === projectCount - 1 ? 100 : 20 + Math.floor(rand() * 75)
    return {
      ...p,
      role: member?.job_title || 'Team Member',
      progress,
      hours: 20 + Math.floor(rand() * 40),
      status: progress === 100 ? 'completed' : 'in_progress',
    }
  })

  const basicSalary = 3000 + Math.floor(rand() * 15) * 100
  const allowances = 300 + Math.floor(rand() * 4) * 50
  const overtimePay = Math.round(overtimeHours * 22)
  const bonuses = rand() > 0.6 ? 200 : 0
  const incentiveSeed = [
    { id: 'inc-1', label: 'Performance incentive', amount: 150 + Math.floor(rand() * 3) * 50 },
    ...(rand() > 0.55 ? [{ id: 'inc-2', label: 'Project completion bonus', amount: 100 + Math.floor(rand() * 2) * 50 }] : []),
  ]
  const incentivesTotal = incentiveSeed.reduce((s, i) => s + i.amount, 0) + bonuses
  const earningsTotal = basicSalary + allowances + overtimePay + incentivesTotal
  const epfEmployee = Math.round(basicSalary * 0.08)
  const etf = Math.round(basicSalary * 0.03)
  const tax = Math.round(earningsTotal * 0.08)
  const otherDeduction = 50 + Math.floor(rand() * 3) * 25
  const deductionItemsSeed = [
    { id: 'ded-tax', type: 'tax', label: 'PAYE Tax', amount: tax, locked: false },
    { id: 'ded-epf', type: 'epf', label: 'EPF (Employee 8%)', amount: epfEmployee, locked: false },
    { id: 'ded-etf', type: 'etf', label: 'ETF (3%)', amount: etf, locked: false },
    { id: 'ded-other', type: 'other', label: 'Other deductions', amount: otherDeduction, locked: false },
  ]
  const deductionsTotal = deductionItemsSeed.reduce((s, d) => s + d.amount, 0)
  const grossSalary = earningsTotal
  const netSalary = Math.max(0, grossSalary - deductionsTotal)
  const payStatus = rand() > 0.55 ? 'ready' : 'draft'
  const currentPeriod = monthLabel(0)

  const payrollHistory = Array.from({ length: 6 }, (_, i) => {
    const monthOffset = 5 - i
    const gross = grossSalary - Math.floor(rand() * 180) + Math.floor(rand() * 120)
    const ded = Math.round(gross * (0.18 + rand() * 0.04))
    const net = gross - ded
    const isCurrent = i === 5
    return {
      id: `pay-${monthOffset}`,
      month: monthLabel(monthOffset),
      gross,
      deductions: ded,
      net,
      incentives: Math.round(incentivesTotal * (0.7 + rand() * 0.4)),
      status: isCurrent ? payStatus : 'paid',
      paidAt: isCurrent ? null : relativeDate(-(monthOffset * 28 + 2)),
      method: isCurrent ? null : pick(rand, ['Bank transfer', 'PayPal', 'Cash']),
    }
  })

  const payrollTrend = payrollHistory.map((h) => ({
    label: h.month.split(' ')[0].slice(0, 3),
    net: h.net,
    gross: h.gross,
    deductions: h.deductions,
  }))

  const quality = 80 + Math.floor(rand() * 18)
  const productivity = 75 + Math.floor(rand() * 20)
  const communication = 85 + Math.floor(rand() * 14)
  const timeliness = 78 + Math.floor(rand() * 20)
  const overallPerformance = Math.round((quality + productivity + communication + timeliness) / 4)

  const goals = [
    { title: `Complete ${projects[0]?.name || 'current'} redesign`, progress: 60 + Math.floor(rand() * 35), due: relativeDate(14), status: 'in_progress' },
    { title: 'Improve client response time', progress: 100, due: relativeDate(-10), status: 'completed' },
    { title: 'Mentor a junior team member', progress: 30 + Math.floor(rand() * 40), due: relativeDate(30), status: 'in_progress' },
  ]

  const reviews = [
    { period: 'Q2 2026', score: overallPerformance - 3, reviewer: 'Morgan Lee', date: relativeDate(-95) },
    { period: 'Q1 2026', score: overallPerformance - 7, reviewer: 'Morgan Lee', date: relativeDate(-185) },
  ]

  const documents = [
    { name: 'Employment Contract', category: 'Employment', uploaded: 'Jan 12, 2023', updated: 'Jan 12, 2023' },
    { name: `Salary Slip - ${monthLabel(1)}`, category: 'Payroll', uploaded: relativeDate(-10), updated: relativeDate(-10) },
    { name: 'NIC / ID Copy', category: 'Identity', uploaded: 'Jan 15, 2023', updated: 'Jan 15, 2023' },
    { name: pick(rand, ['Design Certificate', 'PM Certification', 'AWS Certificate']), category: 'Certificates', uploaded: relativeDate(-120), updated: relativeDate(-120) },
  ]

  const expenseCategories = ['Travel', 'Software', 'Meals', 'Equipment', 'Training']
  const expenses = Array.from({ length: 5 }, (_, i) => {
    const amount = 20 + Math.floor(rand() * 120)
    const statuses = ['approved', 'approved', 'pending', 'approved', 'rejected']
    return {
      date: relativeDate(-i * 3 - 1),
      category: pick(rand, expenseCategories),
      description: pick(rand, ['Client meeting', 'Design subscription', 'Team lunch', 'Monitor stand', 'Online course']),
      amount,
      status: statuses[i % statuses.length],
    }
  })
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const expensePending = expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0)
  const expenseApproved = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0)

  const activity = [
    { icon: 'checkin', title: 'Checked in', desc: '', when: 'Today, 09:02 AM' },
    { icon: 'project', title: 'Updated project progress', desc: projects[0]?.name || '', when: 'Yesterday, 04:20 PM' },
    { icon: 'leave', title: 'Submitted leave request', desc: 'Annual Leave (2 days)', when: relativeDate(-2) },
    { icon: 'doc', title: 'Uploaded document', desc: `Salary Slip - ${monthLabel(1)}`, when: relativeDate(-3) },
  ]

  const taskPool = [
    { title: 'Landing Page for AIDH', area: 'UI Design Work', weight: 80, priority: 'Medium' },
    { title: 'Mobile UI', area: 'UI Design Work', weight: 0, priority: 'Medium' },
    { title: 'Training Video', area: 'UI Design Work', weight: 0, priority: 'Medium' },
    { title: 'Avoora Patient Guide Flyer', area: 'UI Design Work', weight: 0, priority: 'High' },
    { title: 'PPT Formatting and Design Update', area: 'UI Design Work', weight: 0, priority: 'Medium' },
    { title: 'Brand kit refresh', area: projects[0]?.name || 'Brand Work', weight: 40, priority: 'High' },
    { title: 'Client review revisions', area: projects[1]?.name || 'Client Work', weight: 25, priority: 'High' },
    { title: 'Asset export pack', area: projects[0]?.name || 'Delivery', weight: 15, priority: 'Low' },
  ]

  const weekTasks = taskPool.slice(0, 4).map((t, i) => {
    const statuses = ['completed', 'in_progress', 'not_started', 'blocked']
    const status = statuses[i % statuses.length]
    const completion = status === 'completed' ? 100 : status === 'in_progress' ? 45 + Math.floor(rand() * 40) : 0
    return {
      id: `AVOORA`,
      week: 'W1',
      ...t,
      due: relativeDate(i === 0 ? -2 : 5 + i * 3),
      status,
      completion,
      remarks: status === 'blocked' ? 'On hold' : status === 'completed' ? '' : '',
    }
  })

  const upcomingTasks = taskPool.slice(4, 8).map((t, i) => {
    const statuses = ['in_progress', 'not_started', 'overdue', 'not_started']
    const status = statuses[i % statuses.length]
    const completion = status === 'in_progress' ? 30 + Math.floor(rand() * 40) : status === 'overdue' ? 20 : 0
    return {
      id: 'AVOORA',
      week: 'W2',
      ...t,
      due: relativeDate(status === 'overdue' ? -3 : 10 + i * 4),
      status,
      completion,
      remarks: status === 'overdue' ? 'Pls Discuss' : '',
    }
  })

  return {
    liveStatus,
    attendance: {
      pct: attendancePct,
      present,
      late,
      absent,
      overtimeHours,
      week: weekAttendance,
      todayCheckIn: '09:02 AM',
      todayCheckOut: '06:15 PM',
      todayHours: '9h 13m',
    },
    leave: {
      annual: { used: annualUsed, total: annualTotal },
      casual: { used: casualUsed, total: casualTotal },
      medical: { used: medicalUsed, total: medicalTotal },
      trend: buildLeaveBalanceTrend(rand, annualTotal + casualTotal + medicalTotal, annualUsed + casualUsed + medicalUsed),
      requests: [
        { type: 'Annual Leave', start: relativeDate(10), end: relativeDate(11), days: 2, reason: 'Family trip', status: 'approved' },
        { type: 'Medical Leave', start: relativeDate(-5), end: relativeDate(-5), days: 1, reason: 'Not feeling well', status: 'approved' },
        { type: 'Casual Leave', start: relativeDate(25), end: relativeDate(25), days: 1, reason: 'Personal errand', status: 'pending' },
      ],
    },
    payroll: {
      period: currentPeriod,
      status: payStatus,
      currency: 'USD',
      basicSalary,
      allowances,
      overtimePay,
      bonuses,
      incentives: incentiveSeed,
      earnings: [
        { id: 'earn-basic', label: 'Basic salary', amount: basicSalary, type: 'basic', locked: false },
        { id: 'earn-allow', label: 'Allowances', amount: allowances, type: 'allowance', locked: false },
        { id: 'earn-ot', label: 'Overtime', amount: overtimePay, type: 'overtime', locked: false },
        ...incentiveSeed.map((i) => ({ ...i, type: 'incentive', locked: false })),
      ],
      deductionsList: deductionItemsSeed,
      tax,
      epf: epfEmployee,
      etf,
      deductions: deductionsTotal,
      grossSalary,
      netSalary,
      bank: {
        name: pick(rand, ['Commercial Bank', 'HNB', 'Sampath Bank', 'BOC']),
        holder: member?.name || 'Team Member',
        accountNumber: `${8000000000 + Math.floor(rand() * 1999999999)}`,
        branch: pick(rand, ['Colombo 03', 'Kandy', 'Galle', 'Negombo', 'Nugegoda']),
        method: 'Bank transfer',
      },
      payDay: 25,
      trend: payrollTrend,
      history: payrollHistory,
    },
    projects,
    weekTasks,
    upcomingTasks,
    performance: {
      overall: overallPerformance,
      goalsCompletedOf: goals.filter((g) => g.status === 'completed').length,
      goalsTotal: goals.length,
      projectsCompleted: 8 + Math.floor(rand() * 8),
      clientSatisfaction: 88 + Math.floor(rand() * 10),
      quality, productivity, communication, timeliness,
      goals, reviews,
    },
    documents,
    expenses: { items: expenses, total: expenseTotal, pending: expensePending, approved: expenseApproved },
    activity,
  }
}

function monthLabel(monthsAgo) {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function relativeDate(daysOffset) {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Remaining leave balance by month (starts at full allocation, steps down as leave is taken). */
function buildLeaveBalanceTrend(rand, allocated, used) {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthCount = Math.min(new Date().getMonth() + 1, 7)
  const months = labels.slice(0, Math.max(monthCount, 5))
  let remaining = allocated
  let leftToUse = used
  const points = months.map((label, i) => {
    const isLast = i === months.length - 1
    const take = isLast
      ? leftToUse
      : Math.min(leftToUse, Math.max(0, Math.round(leftToUse * (0.08 + rand() * 0.28))))
    leftToUse -= take
    remaining = Math.max(0, remaining - take)
    return { label, remaining, used: allocated - remaining }
  })
  return points
}
