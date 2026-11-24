import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context'
import { clearAuthToken, loginApi, setAuthToken, updateStoredSessionUser } from '../lib/api'
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
    identifier: record.identifier,
    role: normalizedRole,
    created_at: record.created_at || record.createdAt,
    avatar_url: record.avatar_url || null,
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
    const storage = window.sessionStorage.getItem(AUTH_SESSION_KEY) !== null
      ? window.sessionStorage
      : window.localStorage
    const raw = storage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.user?.id) return null
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

      'gm.overview.departments': 'departments',
      'gm.overview.most': 'Most',
      'gm.overview.least': 'Least',
      'gm.card.department': 'Department',
      'gm.card.view_roster': 'View roster',
      'gm.card.employees': 'Employees',
      'gm.attendance.morning': 'Morning session',
      'gm.attendance.afternoon': 'Afternoon session',
      'gm.attendance.overtime': 'Overtime session',
      'gm.attendance.before': 'Attendance opens at',
      'gm.attendance.lunch': 'Lunch break · attendance resumes at',
      'gm.attendance.ended': 'Work day ended · attendance opens tomorrow at',
      'gm.attendance.locked': 'Not in session',
      'gm.attendance.loading': 'Loading attendance…',
      'gm.attendance.error': 'Attendance unavailable',
      'gm.attendance.demo': 'Demo mode · time in / time out is off',
      'gm.attendance.schedule_label': 'Time in / Time out',
      'gm.attendance.schedule_hint': 'Turn off to demo attendance at any hour. Applies to everyone.',
      'gm.attendance.on': 'On',
      'gm.attendance.off': 'Off',
      'gm.attendance.turn_on_title': 'Turn time in / time out on?',
      'gm.attendance.turn_off_title': 'Turn time in / time out off?',
      'gm.attendance.turn_on_msg': 'Attendance follows the work sessions again (7:00–11:30 AM, 1:00–4:00 PM, 4:00–6:00 PM) for everyone.',
      'gm.attendance.turn_off_msg': 'Leadmen can mark workers active at any hour, and marks only reset at midnight. This applies to everyone until you turn it back on.',
      'gm.attendance.schedule_failed': 'Could not change the setting',
      
     
      'gm.employee.title': 'Employee',
      'gm.employee.search': 'Search employees...',
      'gm.employee.all_depts': 'All Departments',
      'gm.employee.no_match': 'No employees matched your filters.',
      'gm.employee.col_id': 'Employee ID',
      'gm.employee.col_name': 'Name',
      'gm.employee.col_department': 'Department',
      'gm.employee.col_status': 'Status',
      'gm.employee.active': 'Active',
      'gm.employee.inactive': 'Inactive',
      'gm.employee.archived': 'Archived',
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
      'nav.settings': 'Settings',
      'nav.history': 'History',
      'nav.returned_by_gm': 'Returned by GM',

      'settings.title': 'Settings',
      'settings.description': 'Manage your account, password and session.',
      'settings.account': 'Account',
      'settings.name': 'Name',
      'settings.username': 'Username',
      'settings.role': 'Role',
      'settings.change_password': 'Change password',
      'settings.change_password_hint': 'Use at least 6 characters. You stay signed in after changing it.',
      'settings.current_password': 'Current password',
      'settings.new_password': 'New password',
      'settings.confirm_password': 'Confirm new password',
      'settings.save_password': 'Update password',
      'settings.saving': 'Updating...',
      'settings.password_updated': 'Password updated',
      'settings.password_updated_message': 'Use your new password the next time you sign in.',
      'settings.err_current': 'Enter your current password.',
      'settings.err_new': 'Enter a new password.',
      'settings.err_short': 'New password must be at least 6 characters.',
      'settings.err_long': 'New password cannot exceed 72 characters.',
      'settings.err_same': 'New password must be different from the current one.',
      'settings.err_match': 'New passwords do not match.',
      'settings.session': 'Session',
      'settings.session_hint': 'Sign out of Tagum Trio Lumber Corporation on this device.',
      'settings.sign_out_title': 'Sign out of Tagum Trio Lumber Corporation?',
      'settings.sign_out_message': 'You will be returned to the login page and will need to sign in again to continue.',
      'settings.stay_signed_in': 'Stay signed in',
      'settings.photo': 'Profile picture',
      'settings.photo_hint': 'JPG, PNG or WebP. Shown next to your name everywhere in the system.',
      'settings.photo_upload': 'Upload photo',
      'settings.photo_change': 'Change photo',
      'settings.photo_saving': 'Saving...',
      'settings.photo_remove': 'Remove photo',
      'settings.photo_remove_title': 'Remove your profile picture?',
      'settings.photo_remove_message': 'Your initials will be shown instead.',
      'settings.photo_updated': 'Profile picture updated',
      'settings.photo_updated_message': 'Your new photo now appears next to your name.',
      'settings.photo_failed': 'Unable to update profile picture',
      'settings.photo_not_image': 'Please choose an image file.',

      'gm.rate.title': 'Rate Management',
      'gm.rate.add_label': 'Add rate',
      'gm.rate.new': 'New department rate',
      'gm.rate.product_placeholder': 'Product / size (e.g. Sizer16cm/18cm)',
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
      'gm.modal.inactive': 'Inactive',
      'gm.modal.col_status': 'Status',
      'gm.modal.employees': 'Employees',

      'requests.title': 'Requests & Submissions',
    
      'requests.tab_pending': 'Pending',
      'requests.tab_approved': 'Approved',
      'requests.tab_rejected': 'Rejected',
      'requests.status_pending': 'PENDING',
      'requests.status_approved': 'APPROVED',
      'requests.status_rejected': 'REJECTED',
      'requests.type': 'Type',
      'requests.duration': 'Duration',
      'requests.requested': 'Requested',
      'requests.one_day': '1 day',
      'requests.days': 'days',
      'requests.approve': 'Approve',
      'requests.reject': 'Reject',
      'requests.processed': 'Processed',
      'requests.empty_pending': 'No pending requests found',
      'requests.empty_approved': 'No approved requests found',
      'requests.empty_rejected': 'No rejected requests found',
      'requests.approve_confirm_title': 'Approve leave request?',
      'requests.approve_confirm_msg': 'Approve leave request for {name}?',
      'requests.yes_approve': 'Yes, approve',
      'requests.no': 'No',
      'requests.approved_title': 'Request approved',
      'requests.approved_msg': 'Leave request for {name} was approved successfully.',
      'requests.approve_failed_title': 'Approval failed',
      'requests.approve_failed_msg': 'Failed to approve request. Please try again.',
      'requests.reject_confirm_title': 'Reject leave request?',
      'requests.reject_confirm_msg': 'Reject leave request from {name}?',
      'requests.yes_reject': 'Yes, reject',
      'requests.rejected_title': 'Request rejected',
      'requests.rejected_msg': 'Leave request from {name} was rejected successfully.',
      'requests.reject_failed_title': 'Rejection failed',
      'requests.reject_failed_msg': 'Failed to reject request. Please try again.',
      'requests.reject_reason_label': 'Reason for rejection',
      'requests.reject_reason_placeholder': 'Tell the employee why this leave was rejected…',
      'requests.rejection_reason': 'Rejection reason',
      'ui.confirm_action': 'Confirm action',
      'ui.success': 'Success',
      'ui.error': 'Something went wrong',
      'leave.type_sick': 'Sick',
      'leave.type_vacation': 'Vacation',
      'leave.type_emergency': 'Emergency',

      'login.hero_eyebrow': 'Tagum Trio Lumber Corporation',
      'login.hero_title': 'Operations, attendance, and payroll in one production flow.',
      'login.hero_desc': 'Sign in with your registered account to access your dedicated dashboard and workflows.',
      'login.hero_feature1': 'Department routing and approvals',
      'login.hero_feature2': 'Production Monitoring and verification chain',
      'login.hero_feature3': 'Payroll and payslip visibility',
      'login.username_placeholder': 'e.g. juan.delacruz',
      'login.password_placeholder': 'Enter your password',
      'login.show_password': 'Show password',
      'login.hide_password': 'Hide password',
      'login.validation_username': 'Enter your username.',
      'login.validation_password': 'Password must be at least 6 characters.',
      'login.signing_in': 'Signing in...',
      'login.forgot_note': 'Password reset will be connected to backend email flow.',
      'login.hr_note': 'Account creation is managed by Human Resources. Please contact your administrator to provision access.',
      'login.error_generic': 'Unable to sign in.',
      'ui.toggle_language': 'Toggle language',

      'notifications.title': 'Notifications',
      'notifications.unread': 'unread',
      'notifications.all_caught_up': "You're all caught up",
      'notifications.mark_all_read': 'Mark all as read',
      'notifications.close': 'Close',
      'notifications.dismiss': 'Dismiss',
      'notifications.empty_title': 'No notifications yet',
      'notifications.empty_desc': 'Updates about your reports and requests will show up here.',
      'notifications.you_have': 'You have',
      'notifications.new_updates': 'new updates',
      'notifications.open_to_see': 'Open notifications to see them all.',
      'notifications.sound_on': 'Turn notification sound on',
      'notifications.sound_off': 'Turn notification sound off',

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
      'gm.consolidated.title': 'Production',
      'gm.consolidated.all_statuses': 'All Statuses',
      'gm.consolidated.tab_all': 'All Reports',
      'gm.consolidated.tab_pending': 'Pending Approval',
      'gm.consolidated.tab_approved': 'Approved',
      'gm.consolidated.view_history': 'View approved in History',
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

      'announcement.translate': 'Translate',
      'announcement.translating': 'Translating...',
      'announcement.show_original': 'Show original',
      'announcement.translate_failed': 'Translation unavailable, try again.',
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
      'gm.card.employees': '员工人数',
      'gm.attendance.morning': '上午班',
      'gm.attendance.afternoon': '下午班',
      'gm.attendance.overtime': '加班',
      'gm.attendance.before': '考勤开放时间',
      'gm.attendance.lunch': '午休 · 考勤恢复时间',
      'gm.attendance.ended': '今日工作已结束 · 明日考勤开放时间',
      'gm.attendance.locked': '非工作时段',
      'gm.attendance.loading': '正在加载考勤…',
      'gm.attendance.error': '考勤暂不可用',
      'gm.attendance.demo': '演示模式 · 上下班时段已关闭',
      'gm.attendance.schedule_label': '上下班时段',
      'gm.attendance.schedule_hint': '关闭后可在任何时间演示考勤，对所有人生效。',
      'gm.attendance.on': '开',
      'gm.attendance.off': '关',
      'gm.attendance.turn_on_title': '开启上下班时段？',
      'gm.attendance.turn_off_title': '关闭上下班时段？',
      'gm.attendance.turn_on_msg': '考勤将重新按工作时段进行（上午 7:00–11:30、下午 1:00–4:00、加班 4:00–6:00），对所有人生效。',
      'gm.attendance.turn_off_msg': '用于演示：领班可在任何时间标记员工到岗，标记仅在午夜重置。在您重新开启前对所有人生效。',
      'gm.attendance.schedule_failed': '无法更改设置',
      'gm.employee.title': '员工',
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
      'nav.settings': '设置',
      'nav.history': '历史记录',
      'nav.returned_by_gm': '总经理退回',

      'settings.title': '设置',
      'settings.description': '管理您的账户、密码和登录状态。',
      'settings.account': '账户',
      'settings.name': '姓名',
      'settings.username': '用户名',
      'settings.role': '角色',
      'settings.change_password': '修改密码',
      'settings.change_password_hint': '至少 6 个字符。修改后仍保持登录。',
      'settings.current_password': '当前密码',
      'settings.new_password': '新密码',
      'settings.confirm_password': '确认新密码',
      'settings.save_password': '更新密码',
      'settings.saving': '更新中...',
      'settings.password_updated': '密码已更新',
      'settings.password_updated_message': '下次登录时请使用新密码。',
      'settings.err_current': '请输入当前密码。',
      'settings.err_new': '请输入新密码。',
      'settings.err_short': '新密码至少需要 6 个字符。',
      'settings.err_long': '新密码不能超过 72 个字符。',
      'settings.err_same': '新密码不能与当前密码相同。',
      'settings.err_match': '两次输入的新密码不一致。',
      'settings.session': '登录状态',
      'settings.session_hint': '在此设备上退出 Tagum Trio Lumber Corporation。',
      'settings.sign_out_title': '确定要退出 Tagum Trio Lumber Corporation 吗？',
      'settings.sign_out_message': '您将返回登录页面，需要重新登录才能继续。',
      'settings.stay_signed_in': '保持登录',
      'settings.photo': '头像',
      'settings.photo_hint': '支持 JPG、PNG 或 WebP。头像会显示在系统中您名字旁边。',
      'settings.photo_upload': '上传照片',
      'settings.photo_change': '更换照片',
      'settings.photo_saving': '保存中...',
      'settings.photo_remove': '移除照片',
      'settings.photo_remove_title': '移除您的头像？',
      'settings.photo_remove_message': '将改为显示您的姓名缩写。',
      'settings.photo_updated': '头像已更新',
      'settings.photo_updated_message': '您的新照片现在会显示在您的名字旁边。',
      'settings.photo_failed': '无法更新头像',
      'settings.photo_not_image': '请选择图片文件。',

      'gm.rate.title': '价格管理',
      
      'gm.rate.add_label': '添加价格',
      'gm.rate.new': '新建部门价格',
      'gm.rate.product_placeholder': '产品/规格（例如 Sizer16cm/18cm）',
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
      'gm.modal.active': '在岗',
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
      'gm.modal.inactive': '未到岗',
      'gm.modal.col_status': '状态',
      'gm.modal.employees': '员工',

      'requests.title': '请求与提交',
      'requests.desc': '管理员工账户提交与请假申请。',
      'requests.tab_pending': '待处理',
      'requests.tab_approved': '已批准',
      'requests.tab_rejected': '已拒绝',
      'requests.status_pending': '待处理',
      'requests.status_approved': '已批准',
      'requests.status_rejected': '已拒绝',
      'requests.type': '类型',
      'requests.duration': '时长',
      'requests.requested': '申请时间',
      'requests.one_day': '1 天',
      'requests.days': '天',
      'requests.approve': '批准',
      'requests.reject': '拒绝',
      'requests.processed': '已处理',
      'requests.empty_pending': '没有待处理的请求',
      'requests.empty_approved': '没有已批准的请求',
      'requests.empty_rejected': '没有已拒绝的请求',
      'requests.approve_confirm_title': '批准请假申请？',
      'requests.approve_confirm_msg': '确定批准 {name} 的请假申请吗？',
      'requests.yes_approve': '确认批准',
      'requests.no': '取消',
      'requests.approved_title': '申请已批准',
      'requests.approved_msg': '{name} 的请假申请已成功批准。',
      'requests.approve_failed_title': '批准失败',
      'requests.approve_failed_msg': '无法批准该申请，请重试。',
      'requests.reject_confirm_title': '拒绝请假申请？',
      'requests.reject_confirm_msg': '确定拒绝 {name} 的请假申请吗？',
      'requests.yes_reject': '确认拒绝',
      'requests.rejected_title': '申请已拒绝',
      'requests.rejected_msg': '{name} 的请假申请已成功拒绝。',
      'requests.reject_failed_title': '拒绝失败',
      'requests.reject_failed_msg': '无法拒绝该申请，请重试。',
      'requests.reject_reason_label': '拒绝原因',
      'requests.reject_reason_placeholder': '请说明拒绝该请假申请的原因…',
      'requests.rejection_reason': '拒绝原因',
      'ui.confirm_action': '确认操作',
      'ui.success': '成功',
      'ui.error': '操作失败',
      'leave.type_sick': '病假',
      'leave.type_vacation': '休假',
      'leave.type_emergency': '紧急事假',

      'login.hero_eyebrow': 'Tagum Trio Lumber Corporation',
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

      'notifications.title': '通知',
      'notifications.unread': '条未读',
      'notifications.all_caught_up': '已全部查看',
      'notifications.mark_all_read': '全部标为已读',
      'notifications.close': '关闭',
      'notifications.dismiss': '关闭',
      'notifications.empty_title': '暂无通知',
      'notifications.empty_desc': '有关报表和申请的更新会显示在这里。',
      'notifications.you_have': '您有',
      'notifications.new_updates': '条新更新',
      'notifications.open_to_see': '打开通知查看全部。',
      'notifications.sound_on': '开启通知提示音',
      'notifications.sound_off': '关闭通知提示音',

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
      'gm.consolidated.title': '生产',
      
      'gm.consolidated.all_statuses': '所有状态',
      'gm.consolidated.tab_all': '所有报表',
      'gm.consolidated.tab_pending': '待审批',
      'gm.consolidated.tab_approved': '已批准',
      'gm.consolidated.view_history': '在历史记录中查看已批准',
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

      'announcement.translate': '翻译',
      'announcement.translating': '翻译中...',
      'announcement.show_original': '显示原文',
      'announcement.translate_failed': '翻译暂不可用，请重试。',
    },
  }

  function t(key, fallback) {
    const val = (translations[language] && translations[language][key]) || translations.en[key]
    return val || fallback || key
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user) clearAuthToken()
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

  // One account per browser: localStorage is already shared across every tab
  // of the same origin, but React state isn't — without this, logging into a
  // different account in one tab leaves other tabs showing the old user while
  // silently making requests as the new one. The native `storage` event only
  // fires on OTHER tabs (never the tab that made the change), so this keeps
  // every open tab mirroring whichever account is currently logged in,
  // including an immediate logout if another tab logs out or clears storage.
  useEffect(() => {
    if (typeof window === 'undefined') return
    function handleStorage(event) {
      if (event.key !== AUTH_SESSION_KEY && event.key !== null) return
      setUser(loadSession())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // On first load, silently try to restore session from existing token
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) return
    const tokenStorage = window.sessionStorage.getItem('triops-auth-token') !== null
      ? window.sessionStorage
      : window.localStorage
    const token = tokenStorage.getItem('triops-auth-token') || ''
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
        setAuthToken(token, tokenStorage === window.localStorage)
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

  const loginWithCredentials = async ({ identifier, password, remember = true }) => {
    try {
      const result = await loginApi({ identifier: normalizeIdentifier(identifier), password, remember })
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

  // Apply a fresh user record from the API (e.g. after changing the profile
  // picture) to both React state and the cached session.
  const updateUser = (record) => {
    if (!record) return
    updateStoredSessionUser(record)
    setUser((current) => buildSessionUser({ ...(current || {}), ...record }))
  }

  return (
    <AuthContext.Provider value={{ user, users, login, loginWithCredentials, logout, updateUser, language, setLanguage, t }}>{children}</AuthContext.Provider>
  )
}
