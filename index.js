const core = require("@actions/core");
const github = require("@actions/github");

const octokit = getOctokit();

async function run() {
    if (isTriggeredByPullRequestEvent()) {
        try {
            await checkTargetBranch();
        } catch (err) {
            console.error(err);
            core.setFailed("An unexpected error occurred.");
        }
    }
}

function isTriggeredByPullRequestEvent() {
    const eventName = github.context.eventName;

    if (eventName === "pull_request" || eventName === "pull_request_target") {
        return true;
    }
    
    core.setFailed("This action should only be used with 'pull_request' or 'pull_request_target' events.");
    return false;
}

async function checkTargetBranch() {
    const base = getBaseBranch();
    const head = getHeadBranch();

    if (isFeatureBranch(head)) {
        if (isDevelopmentBranch(base)) {
            console.log("Head branch is a feature branch and targets a development branch.");
        } else if (isFeatureBranch(base)) {
            console.log("Head branch is a feature branch and targets another feature branch.");
            if (!isPullRequestDraft()) {
                await convertPullRequestToDraft();

                let msg = "This pull request was converted to a draft, because it targets another feature branch. After that branch has been merged, the base of this pull request will be updated automatically and you may mark it ready for review again.";
                console.log(msg);
                await postComment(msg);
            }
        } else {
            let msg = "⛔ Pull requests for feature branches should target a development branch or another feature branch.";
            console.log(msg);
            await postCommentIfBaseChanged(msg);
        }
    } else if (isHotfixBranch(head)) {
        if (isDevelopmentBranch(base)) {
            console.log("Head branch is a hotfix branch and targets a development branch.");
        } else if (isMainBranch(base)) {
            console.log("Head branch is a hotfix branch and targets a main branch.");
        } else {
            let msg = "⛔ Pull requests for hotfix branches should target a development branch or a main branch.";
            console.log(msg);
            await postCommentIfBaseChanged(msg);
        }
    } else {
        let msg = `⚠ The head branch name doesn't have the \`${getFeatureBranchPrefix()}\` or \`${getHotfixBranchPrefix()}\` prefix.`;
        console.log(msg);
        await postCommentIfBaseChanged(msg);
    }
}

function getBaseBranch() {
    return github.context.payload.pull_request.base.ref;
}

function getHeadBranch() {
    return github.context.payload.pull_request.head.ref;
}

function getFeatureBranchPrefix() {
    return core.getInput("feature_branch_prefix", { required: true });
}

function getHotfixBranchPrefix() {
    return core.getInput("hotfix_branch_prefix", { required: true });
}

function isFeatureBranch(branch) {
    return branch.startsWith(getFeatureBranchPrefix());
}

function isHotfixBranch(branch) {
    return branch.startsWith(getHotfixBranchPrefix());
}

function isMainBranch(branch) {
    const pattern = core.getInput("main_branch_pattern", { required: true });
    return new RegExp(pattern).test(branch);
}

function isDevelopmentBranch(branch) {
    const pattern = core.getInput("development_branch_pattern", { required: true });
    return new RegExp(pattern).test(branch);
}

function isPullRequestDraft() {
    return github.context.payload.pull_request.draft;
}

function getOctokit() {
    let token = process.env.GITHUB_TOKEN;
    if (token) {
        return github.getOctokit(token);
    } else {
        throw "The GITHUB_TOKEN environment variable must be set.";
    }
}

async function convertPullRequestToDraft() {
    let pullRequestId = github.context.payload.pull_request.node_id;

    await octokit.graphql(`
        mutation {
            convertPullRequestToDraft(input: {pullRequestId: "${pullRequestId}"}) {
                pullRequest {
                    id
                }
            }
        }
    `);
}

async function postComment(comment) {
    let pr = github.context.payload.pull_request;

    let owner = pr.base.repo.owner.login;
    let repo = pr.base.repo.name;
    let prNumber = pr.number;

    await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: comment
    });
}

async function postCommentIfBaseChanged(comment) {
    let payload = github.context.payload;

    if (payload.action === "opened" || (payload.changes != null && payload.changes.hasOwnProperty('base'))) {
        await postComment(comment);
    }
}

run();