import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context'
import { clearAuthToken, loginApi, setAuthToken } from '../lib/api'
import { DEPARTMENTS } from '../constants/departments'

const AUTH_SESSION_KEY = 'triops-auth-session'

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRole(role) {
  if (!role) return role
  const normalized = String(role).trim().toLowerCase()
  if (normalized === 'production_head') return 'production_incharge'
  if (['admin', 'hr', 'human_resources', 'human-resource', 'human resources'].includes(normalized)) return 'hr'
  if (['general_manager', 'general manager', 'general-manager', 'gm'].includes(normalized)) return 'gm'
  if (['leadman', 'lead man', 'lead_man', 'lead-man'].includes(normalized)) return 'leadman'
  return normalized
}

function buildSessionUser(record) {
  if (!record) return null
  const normalizedRole = normalizeRole(record.role)
  const base = {
    id: record.id,
    name: record.name,
    role: normalizedRole,
    created_at: record.created_at || record.createdAt,
  }

  if (normalizedRole === 'leadman') {
    const leadmanDepartments = Array.isArray(record.departments) && record.departments.length > 0
      ? record.departments.filter((department) => DEPARTMENTS.includes(department))
      : record.department && DEPARTMENTS.includes(record.department)
        ? [record.department]
        : []
    return {
      ...base,
      department: leadmanDepartments[0] || (record.department && DEPARTMENTS.includes(record.department) ? record.department : DEPARTMENTS[0]),
      departments: leadmanDepartments,
    }
  }

  if (record.department) {
    return { ...base, department: record.department }
  }

  return base
}

function loadSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.user?.id) return null
    setAuthToken(parsed.token || parsed.accessToken || '')
    // Normalize legacy leadman saved sessions while preserving the assigned department list.
    if (parsed.user.role === 'leadman') {
      if (Array.isArray(parsed.user.departments)) {
        parsed.user.departments = parsed.user.departments.filter((department) => DEPARTMENTS.includes(department))
      }
      if (!parsed.user.departments || parsed.user.departments.length === 0) {
        parsed.user.departments = parsed.user.department && DEPARTMENTS.includes(parsed.user.department) ? [parsed.user.department] : []
      }
      if (!parsed.user.department && parsed.user.departments.length > 0) {
        parsed.user.department = parsed.user.departments[0]
      }
    }
    return buildSessionUser(parsed.user)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession())
  const [users] = useState([])
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem('triops-lang') || 'en'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('triops-lang', language)
    } catch (e) {
      // ignore
    }
  }, [language])

  const translations = {
    en: {
      'login.welcome': 'Welcome back',
      'login.description': 'Log in with your registered username.',
      'login.identifier': 'Username',
      'login.password': 'Password',
      'login.remember': 'Remember me',
      'login.forgot': 'Forgot password?',
      'login.signin': 'Sign in',
      'leadman.portal': 'Leadman Portal',
      'leadman.create_report': 'Create Report',
      'leadman.incoming_reports': 'Incoming Reports',
      'leadman.deployed_workers': 'Deployed Workers',
      'leadman.daily_report': 'Daily Report',
      'leadman.history': 'History',
      'leadman.assigned': 'Assigned leadman departments',
      'ui.exit': 'Exit',
      'ui.navigation': 'Navigation',
      'ui.signed_in': 'Signed in as',
      'ui.sign_out': 'Sign out',
      'gm.overview.title': 'Department cards',
      'gm.overview.desc': 'Tap a card to open the active employee roster and reassign team members.',
      'gm.overview.departments': 'departments',
      'gm.overview.most': 'Most staffed',
      'gm.overview.least': 'Least staffed',
      'gm.card.department': 'Department',
      'gm.card.view_roster': 'View roster',
      'gm.employee.title': 'Employee Management',
      'gm.employee.desc': 'View and manage employee records backed by the database.',
      'gm.employee.search': 'Search employees...',
      'gm.employee.all_depts': 'All Departments',
      'gm.employee.no_match': 'No employees matched your filters.',
      'gm.employee.col_id': 'Employee ID',
      'gm.employee.col_name': 'Name',
      'gm.employee.col_department': 'Department',
      'gm.employee.col_status': 'Status',
      'gm.employee.active': 'Active',
      'gm.employee.inactive': 'Inactive',
      'gm.announce.title': 'Announcements',
      'gm.announce.create': 'Create broadcast',
      'gm.announce.post': 'Post to all employees',
      'gm.announce.what': "What's the announcement?",
      'gm.announce.body': 'Write the post body...',
      'gm.announce.pin': 'Pin to top of employee feeds',
      'gm.announce.broadcast': 'Broadcasted to all employees',
      'gm.announce.posting': 'Posting...',
      'gm.announce.publish': 'Publish Post',
      'gm.announce.recent': 'Recent announcements',
      'gm.announce.no': 'No announcements yet.',
      'gm.announce.ann_title': 'Announcement title',
      'gm.announce.ann_body': 'Announcement body',
      'gm.announce.pin_top': 'Pin to top',
      'gm.announce.cancel': 'Cancel',
      'gm.announce.saving': 'Saving...',
      'gm.announce.save': 'Save changes',
      'gm.announce.edit': 'Edit post',
      'gm.announce.delete': 'Delete post',
      'gm.announce.visible_to': 'Visible to',
      'gm.announce.all_roles': 'All roles',

      'role.gm': 'General Manager',
      'role.hr': 'Human Resource',
      'role.production_incharge': 'Production In-Charge',
      'role.leadman': 'Leadman',
      'role.employee': 'Employee',
      'role.admin': 'Admin',

      'nav.departments_overview': 'Departments Overview',
      'nav.employees': 'Employees',
      'nav.production': 'Production',
      'nav.reports': 'Reports',
      'nav.all_accounts': 'All Accounts',
      'nav.create_accounts': 'Create Accounts',
      'nav.announcements': 'Announcements',
      'nav.rate_management': 'Rate Management',
      'nav.requests': 'Requests',

      'gm.rate.title': 'Rate Management',
      'gm.rate.add_label': 'Add rate',
      'gm.rate.new': 'New department rate',
      'gm.rate.product_placeholder': 'Product / size (e.g. Sizer16mm/18mm)',
      'gm.rate.price_placeholder': 'Price per unit',
      'gm.rate.adding': 'Adding…',
      'gm.rate.add_btn': 'Add rate',
      'gm.rate.by_dept': 'Rates by department',
      'gm.rate.none': 'No rates configured yet',
      'gm.rate.col_product': 'Product / Size',
      'gm.rate.col_price': 'Price / unit',
      'gm.rate.col_actions': 'Actions',
      'gm.rate.cancel': 'Cancel',
      'gm.rate.saving': 'Saving…',
      'gm.rate.save': 'Save',
      'gm.rate.edit': 'Edit',
      'gm.rate.delete': 'Delete',
      'gm.rate.fail_add': 'Failed to add rate',
      'gm.rate.fail_remove': 'Failed to remove rate',
      'gm.rate.fail_save': 'Failed to save rate',
      'gm.rate.confirm_remove_prefix': 'Remove rate for',

      'gm.modal.team': 'Department team',
      'gm.modal.open_desc': 'Open the employee roster and reassign workers with one click.',
      'gm.modal.active': 'Active',
      'gm.modal.close': 'Close',
      'gm.modal.reassign_title': 'Reassign employees',
      'gm.modal.reassign_desc': 'Select a department and reassign employees directly from the roster.',
      'gm.modal.target_dept': 'Target department',
      'gm.modal.select_dept': 'Select department',
      'gm.modal.col_employee': 'Employee',
      'gm.modal.col_id': 'ID',
      'gm.modal.col_role': 'Role',
      'gm.modal.col_action': 'Action',
      'gm.modal.no_employees': 'No employees',
      'gm.modal.no_employees_desc': 'No active employees assigned to this department.',
      'gm.modal.view': 'View',
      'gm.modal.reassign_btn': 'Reassign',
      'gm.modal.saving': 'Saving...',
      'gm.modal.select_target_title': 'Select target department',
      'gm.modal.select_target_msg': 'Please select a department before reassigning this employee.',
      'gm.modal.reassigned_title': 'Employee reassigned',
      'gm.modal.reassign_failed_title': 'Reassignment failed',
      'gm.modal.reassign_failed_msg': 'Unable to reassign employee. Please try again.',
      'gm.modal.unknown': 'Unknown',
      'gm.modal.unassigned': 'Unassigned',
      'gm.modal.role_default': 'Employee',
      'gm.modal.reassigned_msg': 'was reassigned from',
      'gm.modal.reassigned_to': 'to',

      'login.hero_eyebrow': 'TriOPS Workforce',
      'login.hero_title': 'Operations, attendance, and payroll in one production flow.',
      'login.hero_desc': 'Sign in with your registered account to access your dedicated dashboard and workflows.',
      'login.hero_feature1': 'Department routing and approvals',
      'login.hero_feature2': 'Live scan verification chain',
      'login.hero_feature3': 'Payroll and payslip visibility',
      'login.username_placeholder': 'e.g. juan.delacruz',
      'login.password_placeholder': 'Enter your password',
      'login.show_password': 'Show password',
      'login.hide_password': 'Hide password',
      'login.validation_username': 'Enter your username.',
      'login.validation_password': 'Password must be at least 6 characters.',
      'login.signing_in': 'Signing in...',
      'login.forgot_note': 'Password reset will be connected to backend email flow.',
      'login.hr_note': 'Account creation is managed by HR. Please contact your administrator to provision access.',
      'login.error_generic': 'Unable to sign in.',
      'ui.toggle_language': 'Toggle language',

      'status.submitted': 'Awaiting leadman verification',
      'status.leadman_verified': 'Leadman verified',
      'status.compiled': 'Compiled',
      'status.gm_submitted': 'Pending GM approval',
      'status.approved': 'Approved — payroll released',
      'status.rejected': 'Rejected',
      'status.mixed': 'Mixed statuses',

      'report.bundle.daily_reports': 'Daily reports',
      'report.bundle.reports': 'Reports',
      'report.bundle.employees': 'Employees',
      'report.bundle.status': 'Status',
      'report.bundle.total_amount': 'Total amount',
      'report.bundle.open': 'Open bundle',

      'report.modal.daily_reports_for_day': 'Daily reports for this day',
      'report.modal.close': 'Close',
      'report.modal.working': 'Working...',

      'report.detail.daily_report': 'Daily report',
      'report.detail.submitted_by': 'Submitted by',
      'report.detail.unknown': 'Unknown',
      'report.detail.unknown_department': 'Unknown Department',
      'report.detail.employees_involved': 'Employees involved',
      'report.detail.product': 'Product',
      'report.detail.quantity': 'Quantity',
      'report.detail.total_amount': 'Total amount',
      'report.detail.notes': 'Report notes',
      'report.detail.no_notes': 'No notes provided.',
      'report.detail.images': 'Images',
      'report.detail.preview_images': 'Preview images',
      'report.detail.no_images': 'No images submitted',
      'report.detail.report_images': 'Report images',
      'report.detail.close': 'Close',

      'table.department': 'Department',
      'table.product': 'Product',
      'table.quantity': 'Quantity',
      'table.date': 'Date',
      'table.amount': 'Amount',
      'table.employees': 'Employees',
      'table.photos': 'Photos',
      'table.no_entries': 'No report entries yet.',
      'table.employees_involved': 'Employees involved',
      'table.evidence_photos': 'Evidence photos',
      'table.unknown_employee': 'Unknown employee',

      'gm.consolidated.eyebrow': 'Production consolidated',
      'gm.consolidated.title': 'Consolidated production report cards',
      'gm.consolidated.all_statuses': 'All Statuses',
      'gm.consolidated.tab_all': 'All Reports',
      'gm.consolidated.tab_pending': 'Pending Approval',
      'gm.consolidated.tab_approved': 'Approved',
      'gm.consolidated.empty_pending': 'No reports awaiting approval',
      'gm.consolidated.empty_approved': 'No approved reports yet',
      'gm.consolidated.empty_all': 'No submitted reports yet',
      'gm.consolidated.confirm_title': 'Approve this bundle?',
      'gm.consolidated.confirm_message': 'Approving releases payroll for every employee across all {count} reports in this bundle.',
      'gm.consolidated.confirm_confirm': 'Approve & release payroll',
      'gm.consolidated.confirm_cancel': 'Cancel',
      'gm.consolidated.approved_title': 'Bundle approved',
      'gm.consolidated.approved_message': 'The bundle has been approved and payroll has been released.',
      'gm.consolidated.approval_failed_title': 'Approval failed',
      'gm.consolidated.approval_failed_message': 'Unable to approve this bundle.',
      'gm.consolidated.approve_btn': 'Approve & release payroll ({count})',
      'gm.consolidated.approving': 'Approving...',
    },
    zh: {
      'login.welcome': '欢迎回来',
      'login.description': '使用您注册的用户名登录。',
      'login.identifier': '用户名',
      'login.password': '密码',
      'login.remember': '记住我',
      'login.forgot': '忘记密码？',
      'login.signin': '登录',
      'leadman.portal': '领班门户',
      'leadman.create_report': '创建报表',
      'leadman.incoming_reports': '待处理报表',
      'leadman.deployed_workers': '在岗员工',
      'leadman.daily_report': '日报',
      'leadman.history': '历史记录',
      'leadman.assigned': '分配的领班部门',
      'ui.exit': '退出',
      'ui.navigation': '导航',
      'ui.signed_in': '登录用户',
      'ui.sign_out': '登出',
      'gm.overview.title': '部门卡片',
      'gm.overview.desc': '点击卡片查看在职员工名单并重新分配团队成员。',
      'gm.overview.departments': '个部门',
      'gm.overview.most': '人数最多',
      'gm.overview.least': '人数最少',
      'gm.card.department': '部门',
      'gm.card.view_roster': '查看名单',
      'gm.employee.title': '员工管理',
      'gm.employee.desc': '查看和管理数据库中的员工记录。',
      'gm.employee.search': '搜索员工...',
      'gm.employee.all_depts': '所有部门',
      'gm.employee.no_match': '没有符合筛选条件的员工。',
      'gm.employee.col_id': '员工编号',
      'gm.employee.col_name': '姓名',
      'gm.employee.col_department': '部门',
      'gm.employee.col_status': '状态',
      'gm.employee.active': '在职',
      'gm.employee.inactive': '停用',
      'gm.announce.title': '公告',
      'gm.announce.desc': '向所有员工广播类似Facebook的帖子。',
      'gm.announce.create': '创建广播',
      'gm.announce.post': '发布给所有员工',
      'gm.announce.what': '公告标题是什么？',
      'gm.announce.body': '编写帖子内容...',
      'gm.announce.pin': '置顶到员工源',
      'gm.announce.broadcast': '已发布给所有员工',
      'gm.announce.posting': '发布中...',
      'gm.announce.publish': '发布帖子',
      'gm.announce.recent': '最近公告',
      'gm.announce.no': '还没有公告。',
      'gm.announce.ann_title': '公告标题',
      'gm.announce.ann_body': '公告内容',
      'gm.announce.pin_top': '置顶',
      'gm.announce.cancel': '取消',
      'gm.announce.saving': '保存中...',
      'gm.announce.save': '保存更改',
      'gm.announce.edit': '编辑帖子',
      'gm.announce.delete': '删除帖子',
      'gm.announce.visible_to': '可见范围',
      'gm.announce.all_roles': '所有角色',

      'role.gm': '总经理',
      'role.hr': '人力资源',
      'role.production_incharge': '生产主管',
      'role.leadman': '领班',
      'role.employee': '员工',
      'role.admin': '管理员',

      'nav.departments_overview': '部门总览',
      'nav.employees': '员工',
      'nav.production': '生产',
      'nav.reports': '报表',
      'nav.all_accounts': '所有账户',
      'nav.create_accounts': '创建账户',
      'nav.announcements': '公告',
      'nav.rate_management': '价格管理',
      'nav.requests': '请求',

      'gm.rate.title': '价格管理',
      'gm.rate.desc': '设置各部门产品的每件/每单位价格。领班报表会自动调用这些价格。',
      'gm.rate.add_label': '添加价格',
      'gm.rate.new': '新建部门价格',
      'gm.rate.product_placeholder': '产品/规格（例如 Sizer16mm/18mm）',
      'gm.rate.price_placeholder': '每单位价格',
      'gm.rate.adding': '添加中…',
      'gm.rate.add_btn': '添加价格',
      'gm.rate.by_dept': '按部门查看价格',
      'gm.rate.none': '尚未设置价格',
      'gm.rate.col_product': '产品/规格',
      'gm.rate.col_price': '每单位价格',
      'gm.rate.col_actions': '操作',
      'gm.rate.cancel': '取消',
      'gm.rate.saving': '保存中…',
      'gm.rate.save': '保存',
      'gm.rate.edit': '编辑',
      'gm.rate.delete': '删除',
      'gm.rate.fail_add': '添加价格失败',
      'gm.rate.fail_remove': '删除价格失败',
      'gm.rate.fail_save': '保存价格失败',
      'gm.rate.confirm_remove_prefix': '确定删除价格：',

      'gm.modal.team': '部门团队',
      'gm.modal.open_desc': '打开员工名单，一键重新分配员工。',
      'gm.modal.active': '在职',
      'gm.modal.close': '关闭',
      'gm.modal.reassign_title': '重新分配员工',
      'gm.modal.reassign_desc': '选择部门并直接从名单中重新分配员工。',
      'gm.modal.target_dept': '目标部门',
      'gm.modal.select_dept': '选择部门',
      'gm.modal.col_employee': '员工',
      'gm.modal.col_id': '编号',
      'gm.modal.col_role': '角色',
      'gm.modal.col_action': '操作',
      'gm.modal.no_employees': '暂无员工',
      'gm.modal.no_employees_desc': '该部门目前没有在职员工。',
      'gm.modal.view': '查看',
      'gm.modal.reassign_btn': '重新分配',
      'gm.modal.saving': '保存中...',
      'gm.modal.select_target_title': '请选择目标部门',
      'gm.modal.select_target_msg': '请先选择部门，然后再重新分配该员工。',
      'gm.modal.reassigned_title': '员工已重新分配',
      'gm.modal.reassign_failed_title': '重新分配失败',
      'gm.modal.reassign_failed_msg': '无法重新分配员工，请重试。',
      'gm.modal.unknown': '未知',
      'gm.modal.unassigned': '未分配',
      'gm.modal.role_default': '员工',
      'gm.modal.reassigned_msg': '已从',
      'gm.modal.reassigned_to': '重新分配至',

      'login.hero_eyebrow': 'TriOPS 劳动力管理',
      'login.hero_title': '运营、出勤与薪资，一体化生产流程。',
      'login.hero_desc': '使用您的注册账户登录，访问专属仪表盘与工作流程。',
      'login.hero_feature1': '部门流转与审批',
      'login.hero_feature2': '实时扫描核实链',
      'login.hero_feature3': '薪资与工资单可视化',
      'login.username_placeholder': '例如 juan.delacruz',
      'login.password_placeholder': '请输入密码',
      'login.show_password': '显示密码',
      'login.hide_password': '隐藏密码',
      'login.validation_username': '请输入用户名。',
      'login.validation_password': '密码长度至少为6个字符。',
      'login.signing_in': '登录中...',
      'login.forgot_note': '密码重置功能将连接后端邮件流程。',
      'login.hr_note': '账户由人力资源部门创建。如需开通权限，请联系管理员。',
      'login.error_generic': '登录失败，请重试。',
      'ui.toggle_language': '切换语言',

      'status.submitted': '等待领班核实',
      'status.leadman_verified': '领班已核实',
      'status.compiled': '已汇总',
      'status.gm_submitted': '待总经理审批',
      'status.approved': '已批准 — 薪资已发放',
      'status.rejected': '已拒绝',
      'status.mixed': '多种状态',

      'report.bundle.daily_reports': '日报',
      'report.bundle.reports': '报表',
      'report.bundle.employees': '员工',
      'report.bundle.status': '状态',
      'report.bundle.total_amount': '总金额',
      'report.bundle.open': '打开报表组',

      'report.modal.daily_reports_for_day': '当日日报',
      'report.modal.close': '关闭',
      'report.modal.working': '处理中...',

      'report.detail.daily_report': '日报',
      'report.detail.submitted_by': '提交人',
      'report.detail.unknown': '未知',
      'report.detail.unknown_department': '未知部门',
      'report.detail.employees_involved': '涉及员工',
      'report.detail.product': '产品',
      'report.detail.quantity': '数量',
      'report.detail.total_amount': '总金额',
      'report.detail.notes': '报告备注',
      'report.detail.no_notes': '暂无备注。',
      'report.detail.images': '图片',
      'report.detail.preview_images': '预览图片',
      'report.detail.no_images': '没有提交图片',
      'report.detail.report_images': '报告图片',
      'report.detail.close': '关闭',

      'table.department': '部门',
      'table.product': '产品',
      'table.quantity': '数量',
      'table.date': '日期',
      'table.amount': '金额',
      'table.employees': '员工',
      'table.photos': '照片',
      'table.no_entries': '暂无报告记录。',
      'table.employees_involved': '涉及员工',
      'table.evidence_photos': '证明照片',
      'table.unknown_employee': '未知员工',

      'gm.consolidated.eyebrow': '生产汇总',
      'gm.consolidated.title': '生产报表汇总卡片',
      'gm.consolidated.desc': '每张卡片汇总某部门当天的报表。打开卡片可查看其中的各份报表。',
      'gm.consolidated.all_statuses': '所有状态',
      'gm.consolidated.tab_all': '所有报表',
      'gm.consolidated.tab_pending': '待审批',
      'gm.consolidated.tab_approved': '已批准',
      'gm.consolidated.empty_pending': '暂无待审批的报表',
      'gm.consolidated.empty_approved': '暂无已批准的报表',
      'gm.consolidated.empty_all': '暂无已提交的报表',
      'gm.consolidated.confirm_title': '批准此报表组？',
      'gm.consolidated.confirm_message': '批准后将为该组内全部 {count} 份报表中的每位员工发放薪资。',
      'gm.consolidated.confirm_confirm': '批准并发放薪资',
      'gm.consolidated.confirm_cancel': '取消',
      'gm.consolidated.approved_title': '报表组已批准',
      'gm.consolidated.approved_message': '该报表组已批准，薪资已发放。',
      'gm.consolidated.approval_failed_title': '批准失败',
      'gm.consolidated.approval_failed_message': '无法批准此报表组。',
      'gm.consolidated.approve_btn': '批准并发放薪资（{count}）',
      'gm.consolidated.approving': '批准中...',
    },
  }

  function t(key, fallback) {
    const val = (translations[language] && translations[language][key]) || translations.en[key]
    return val || fallback || key
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user) {
      window.localStorage.removeItem(AUTH_SESSION_KEY)
      clearAuthToken()
      return
    }
    const token = window.localStorage.getItem('triops-auth-token') || ''
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user, token }))
  }, [user])

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('triops-auth-unauthorized', handleUnauthorized)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('triops-auth-unauthorized', handleUnauthorized)
      }
    }
  }, [])

  // On first load, silently try to restore session from existing token
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) return
    const token = window.localStorage.getItem('triops-auth-token') || ''
    if (!token) return

    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        if (!mounted) return
        if (!res.ok) {
          clearAuthToken()
          setUser(null)
          return
        }
        const result = await res.json()
        setAuthToken(token)
        setUser(buildSessionUser(result))
      } catch (e) {
        clearAuthToken()
        setUser(null)
      }
    })()

    return () => { mounted = false }
  }, [])

  const login = (role) => {
    if (!role) {
      setUser(null)
      return
    }

    const normalizedRole = normalizeRole(role)
    const fallback = {
      id: Date.now(),
      identifier: `${normalizedRole}@triops.local`,
      name: normalizedRole.replace('_', ' ').replace(/\b\w/g, (s) => s.toUpperCase()),
      role: normalizedRole,
      department: normalizedRole === 'leadman' ? DEPARTMENTS[0] : undefined,
      departments: normalizedRole === 'leadman' ? [DEPARTMENTS[0]] : undefined,
      status: 'active',
      is_active: true,
    }
    setUser(buildSessionUser(fallback))
  }

  const loginWithCredentials = async ({ identifier, password }) => {
    try {
      const result = await loginApi({ identifier: normalizeIdentifier(identifier), password })
      const token = result.accessToken || result.access_token || ''
      setAuthToken(token)
      setUser(buildSessionUser(result.user))
      return { ok: true, user: buildSessionUser(result.user) }
    } catch (error) {
      return { ok: false, error: error.message || 'Unable to sign in.' }
    }
  }

  const logout = () => {
    clearAuthToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, users, login, loginWithCredentials, logout, language, setLanguage, t }}>{children}</AuthContext.Provider>
  )
}
