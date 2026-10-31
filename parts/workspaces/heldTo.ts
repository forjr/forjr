import type { Caller } from '../core/index.ts'
import { ForjrError } from '../core/index.ts'
import type { Workspace, WorkspacesOptions } from './face.ts'

/**
 * Takes what the workspaces were made with, a caller and a workspace. Throws F3101 where the caller is neither the
 * owner of the workspace nor someone whom `may` of the workspaces lets in, and answers nothing otherwise.
 */
export function heldTo(o: WorkspacesOptions, caller: Caller, workspace: Workspace): void {
  const owner = caller.kind === 'user' && caller.user?.id === workspace.owner
  if (!owner && !(o.may?.(caller, workspace) ?? false))
    throw new ForjrError('F3101', `The caller may not use the workspace ${workspace.id}.`, {
      fix: "A workspace is its owner's, and of whoever `may` of the workspaces lets in.",
    })
}
