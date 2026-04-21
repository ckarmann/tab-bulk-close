export type FilterCheck = 'negative' | null

export interface FilterDescriptor {
  attributes: string
  check: FilterCheck
  filterValue: string | number | boolean | null
}

export type ActiveFilters = Record<string, FilterDescriptor | null>

export interface StateData {
  groups: string[]
  mapping: Record<string, string>
  lockedUrls: string[]
}

export type RequestMessageType =
  | 'command:add_group'
  | 'command:ungroup'
  | 'command:move_domain'
  | 'command:toggle_lock'
  | 'command:close_group'
  | 'command:extract_group'
  | 'query:get_tabs_snapshot'

export interface AddGroupPayload {
  newGroupName?: string
}

export interface UngroupPayload {
  groupName?: string
}

export interface MoveDomainPayload {
  domain?: string
  newGroup?: string
}

export interface ToggleLockPayload {
  url?: string
}

export interface CloseGroupPayload {
  groupName?: string
  activeFilters?: ActiveFilters
}

export interface ExtractGroupPayload {
  group?: string
}

export interface GetTabsSnapshotPayload {
}

export type RequestPayload =
  | AddGroupPayload
  | UngroupPayload
  | MoveDomainPayload
  | ToggleLockPayload
  | CloseGroupPayload
  | ExtractGroupPayload
  | GetTabsSnapshotPayload

export interface RequestMessage {
  type: RequestMessageType
  payload?: RequestPayload
  requestId?: string
}

export type MessageErrorCode = 'invalid_message' | 'unknown_type' | 'execution_failed'

export interface MessageError {
  code: MessageErrorCode
  message: string
}

export interface ErrorResponse {
  ok: false
  requestId?: string
  error: MessageError
}

export interface SuccessResponse<TResult = unknown> {
  ok: true
  requestId?: string
  result: TResult
}

export type RouterResponse<TResult = unknown> = SuccessResponse<TResult> | ErrorResponse

export type StateChangedReason =
  | 'tab_created'
  | 'tab_removed'
  | 'tab_updated'
  | 'tab_updated_title'
  | 'tab_activated'
  | 'window_focus_changed'
  | 'command:add_group'
  | 'command:ungroup'
  | 'command:move_domain'
  | 'command:toggle_lock'
  | 'command:close_group'
  | 'command:extract_group'

export interface StateChangedPayload {
  source: 'background'
  reason: StateChangedReason | string
  timestamp: number
  changedTabIds: number[]
  title?: string
  [key: string]: unknown
}

export interface StateChangedMessage {
  type: 'state_changed'
  payload: StateChangedPayload
}

export interface WindowModel {
  id: number
  tabCount: number
}

export interface TabItemModel {
  id: number
  url: string
  title?: string
  pinned?: boolean
  locked?: boolean
  duplicate?: boolean
  windowId: number
  lastAccessedFriendly?: string
  lastAccessedString?: string
  lastAccessedColor?: string
  dayFilter?: string
}

export interface DomainModel {
  name: string
  id: string
  items: TabItemModel[]
}

export interface GroupModel {
  name: string
  id: string
  tabCount: number
  isOthers: boolean
  subgroups: DomainModel[]
}

export interface TabsModel {
  groups: GroupModel[]
  windows: WindowModel[]
}

export interface GetTabsSnapshotResult {
  tabsModel: TabsModel
}
