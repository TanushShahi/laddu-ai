/**
 * Autonomous Multi-Step Task Planner
 * Orchestrates tasks using the PLAN -> EXECUTE -> VERIFY -> REPORT lifecycle.
 */
import crypto from 'node:crypto';

export class TaskPlanner {
  constructor(options = {}) {
    this.toolRegistry = options.toolRegistry;
    this.activeTasks = new Map(); // taskId -> task plan
  }

  /**
   * Create and execute a multi-step task plan
   * @param {string} goal
   * @param {Object} [options]
   * @param {Function} [options.onProgress]
   */
  async planAndExecute(goal, options = {}) {
    const taskId = crypto.randomUUID();
    const taskPlan = {
      taskId,
      goal,
      stage: 'PLAN', // PLAN, EXECUTE, VERIFY, REPORT, COMPLETED, FAILED
      steps: [],
      results: [],
      summary: '',
      createdAt: new Date().toISOString()
    };

    this.activeTasks.set(taskId, taskPlan);
    const update = (stage, details = {}) => {
      taskPlan.stage = stage;
      Object.assign(taskPlan, details);
      if (options.onProgress) options.onProgress({ taskId, stage, ...details });
    };

    // 1. STAGE: PLAN
    update('PLAN', { status: 'Generating execution steps...' });
    const steps = this._decomposeGoal(goal);
    taskPlan.steps = steps;

    // 2. STAGE: EXECUTE
    update('EXECUTE', { status: `Executing ${steps.length} steps...` });
    const executionResults = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      step.status = 'IN_PROGRESS';
      update('EXECUTE', { currentStepIndex: i, currentStep: step.description });

      try {
        let stepOutput = null;
        if (step.toolName && this.toolRegistry) {
          stepOutput = await this.toolRegistry.execute(step.toolName, step.params, options);
        } else {
          // Internal step simulation/execution
          stepOutput = { success: true, result: `Completed: ${step.description}` };
        }

        step.status = stepOutput.success ? 'COMPLETED' : 'FAILED';
        step.output = stepOutput;
        executionResults.push(stepOutput);

        if (!stepOutput.success && stepOutput.blocked) {
          // Blocked by permission or danger challenge
          update('FAILED', {
            error: `Plan halted at step ${i + 1}: ${stepOutput.reason || stepOutput.error}`,
            blockedStep: step
          });
          return taskPlan;
        }
      } catch (err) {
        step.status = 'FAILED';
        step.error = err.message;
        update('FAILED', { error: `Step failed: ${err.message}` });
        return taskPlan;
      }
    }

    // 3. STAGE: VERIFY
    update('VERIFY', { status: 'Verifying results against expectations...' });
    const failedSteps = taskPlan.steps.filter(s => s.status === 'FAILED');
    const isVerified = failedSteps.length === 0;

    // 4. STAGE: REPORT
    update('REPORT', { status: 'Compiling completion report...' });
    const reportSummary = this._generateReport(goal, taskPlan.steps, isVerified);
    taskPlan.summary = reportSummary;

    update(isVerified ? 'COMPLETED' : 'FAILED', {
      isVerified,
      summary: reportSummary,
      completedAt: new Date().toISOString()
    });

    return taskPlan;
  }

  _decomposeGoal(goal) {
    const text = goal.toLowerCase();

    // Goal: organize directory
    if (text.includes('organize') && (text.includes('folder') || text.includes('directory') || text.includes('downloads'))) {
      const targetDirMatch = goal.match(/organize\s+(?:my\s+)?([a-zA-Z0-9_\-\.\/\\ ]+)/i);
      const targetDir = targetDirMatch ? targetDirMatch[1].trim() : '.';

      return [
        {
          id: 1,
          description: `Analyze contents and inspect files in ${targetDir}`,
          toolName: 'list_directory',
          params: { dirPath: targetDir }
        },
        {
          id: 2,
          description: `Sort and categorize files into Documents, Images, Code, and Archives`,
          toolName: 'organize_folder',
          params: { targetDir, dryRun: false }
        },
        {
          id: 3,
          description: `Verify sorted directory layout`,
          toolName: 'list_directory',
          params: { dirPath: targetDir }
        }
      ];
    }

    // Goal: system diagnostic check
    if (text.includes('diagnostic') || text.includes('system check') || text.includes('health')) {
      return [
        {
          id: 1,
          description: 'Probe hardware metrics, CPU load, and RAM allocation',
          toolName: 'get_system_diagnostics',
          params: {}
        }
      ];
    }

    // Default multi-step plan
    return [
      {
        id: 1,
        description: `Analyze requirements for "${goal}"`,
        toolName: null,
        params: {}
      },
      {
        id: 2,
        description: `Synthesize structured resolution`,
        toolName: null,
        params: {}
      }
    ];
  }

  _generateReport(goal, steps, isVerified) {
    let report = `### Task Report: ${goal}\n\n`;
    report += `**Status**: ${isVerified ? 'Success (All steps verified)' : 'Incomplete (Errors detected)'}\n\n`;
    report += `**Steps Executed**:\n`;

    steps.forEach((s, idx) => {
      const icon = s.status === 'COMPLETED' ? '[x]' : '[ ]';
      report += `- ${icon} Step ${idx + 1}: ${s.description} — *${s.status}*\n`;
    });

    return report;
  }

  getTask(taskId) {
    return this.activeTasks.get(taskId) || null;
  }
}

export default TaskPlanner;
