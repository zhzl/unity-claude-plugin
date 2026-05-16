# 高级插件示例

一个复杂的企业级插件，包含 MCP 集成和高级组织结构。

## 目录结构

```
enterprise-devops/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── ci/
│   │   ├── build.md
│   │   ├── test.md
│   │   └── deploy.md
│   ├── monitoring/
│   │   ├── status.md
│   │   └── logs.md
│   └── admin/
│       ├── configure.md
│       └── manage.md
├── agents/
│   ├── orchestration/
│   │   ├── deployment-orchestrator.md
│   │   └── rollback-manager.md
│   └── specialized/
│       ├── kubernetes-expert.md
│       ├── terraform-expert.md
│       └── security-auditor.md
├── skills/
│   ├── kubernetes-ops/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── deployment-patterns.md
│   │   │   ├── troubleshooting.md
│   │   │   └── security.md
│   │   ├── examples/
│   │   │   ├── basic-deployment.yaml
│   │   │   ├── stateful-set.yaml
│   │   │   └── ingress-config.yaml
│   │   └── scripts/
│   │       ├── validate-manifest.sh
│   │       └── health-check.sh
│   ├── terraform-iac/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── best-practices.md
│   │   └── examples/
│   │       └── module-template/
│   └── ci-cd-pipelines/
│       ├── SKILL.md
│       └── references/
│           └── pipeline-patterns.md
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       ├── security/
│       │   ├── scan-secrets.sh
│       │   ├── validate-permissions.sh
│       │   └── audit-changes.sh
│       ├── quality/
│       │   ├── check-config.sh
│       │   └── verify-tests.sh
│       └── workflow/
│           ├── notify-team.sh
│           └── update-status.sh
├── .mcp.json
├── servers/
│   ├── kubernetes-mcp/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── lib/
│   ├── terraform-mcp/
│   │   ├── main.py
│   │   └── requirements.txt
│   └── github-actions-mcp/
│       ├── server.js
│       └── package.json
├── lib/
│   ├── core/
│   │   ├── logger.js
│   │   ├── config.js
│   │   └── auth.js
│   ├── integrations/
│   │   ├── slack.js
│   │   ├── pagerduty.js
│   │   └── datadog.js
│   └── utils/
│       ├── retry.js
│       └── validation.js
└── config/
    ├── environments/
    │   ├── production.json
    │   ├── staging.json
    │   └── development.json
    └── templates/
        ├── deployment.yaml
        └── service.yaml
```

## 文件内容

### .claude-plugin/plugin.json

```json
{
  "name": "enterprise-devops",
  "version": "2.3.1",
  "description": "Comprehensive DevOps automation for enterprise CI/CD pipelines, infrastructure management, and monitoring",
  "author": {
    "name": "DevOps Platform Team",
    "email": "devops-platform@company.com",
    "url": "https://company.com/teams/devops"
  },
  "homepage": "https://docs.company.com/plugins/devops",
  "repository": {
    "type": "git",
    "url": "https://github.com/company/devops-plugin.git"
  },
  "license": "Apache-2.0",
  "keywords": [
    "devops",
    "ci-cd",
    "kubernetes",
    "terraform",
    "automation",
    "infrastructure",
    "deployment",
    "monitoring"
  ],
  "commands": ["./commands/ci", "./commands/monitoring", "./commands/admin"],
  "agents": ["./agents/orchestration", "./agents/specialized"],
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

### .mcp.json

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/kubernetes-mcp/index.js"],
      "env": {
        "KUBECONFIG": "${KUBECONFIG}",
        "K8S_NAMESPACE": "${K8S_NAMESPACE:-default}"
      }
    },
    "terraform": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/terraform-mcp/main.py"],
      "env": {
        "TF_STATE_BUCKET": "${TF_STATE_BUCKET}",
        "AWS_REGION": "${AWS_REGION}"
      }
    },
    "github-actions": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/github-actions-mcp/server.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "GITHUB_ORG": "${GITHUB_ORG}"
      }
    }
  }
}
```

### commands/ci/build.md

```markdown
---
name: build
description: Trigger and monitor CI build pipeline
---

# Build Command

Trigger CI/CD build pipeline and monitor progress in real-time.

## Process

1. **Validation**: Check prerequisites
   - Verify branch status
   - Check for uncommitted changes
   - Validate configuration files

2. **Trigger**: Start build via the plugin's GitHub Actions MCP server or a wrapper script. Example pseudocode:
   \`\`\`text
   invoke github-actions MCP tool to trigger build.yml for the current branch
   capture the returned workflow run ID for monitoring
   \`\`\`

3. **Monitor**: Track build progress
   - Display real-time logs
   - Show test results as they complete
   - Alert on failures

4. **Report**: Summarize results
   - Build status
   - Test coverage
   - Performance metrics
   - Deploy readiness

## Integration

After successful build:

- Offer to deploy to staging
- Suggest performance optimizations
- Generate deployment checklist
```

### agents/orchestration/deployment-orchestrator.md

```markdown
---
name: deployment-orchestrator
description: |
  Use this agent when planning or executing multi-environment deployments, coordinating service dependencies, monitoring health, handling rollbacks, or managing approvals.
model: opus
color: purple
---

# Deployment Orchestrator Agent

Specialized agent for orchestrating complex deployments across multiple environments.

## Expertise

- **Deployment strategies**: Blue-green, canary, rolling updates
- **Dependency management**: Service startup ordering, dependency injection
- **Health monitoring**: Service health checks, metric validation
- **Rollback automation**: Automatic rollback on failure detection
- **Approval workflows**: Multi-stage approval processes

## Orchestration Process

1. **Planning Phase**
   - Analyze deployment requirements
   - Identify service dependencies
   - Generate deployment plan
   - Calculate rollback strategy

2. **Validation Phase**
   - Verify environment readiness
   - Check resource availability
   - Validate configurations
   - Run pre-deployment tests

3. **Execution Phase**
   - Deploy services in dependency order
   - Monitor health after each stage
   - Validate metrics and logs
   - Proceed to next stage on success

4. **Verification Phase**
   - Run smoke tests
   - Validate service integration
   - Check performance metrics
   - Confirm deployment success

5. **Rollback Phase** (if needed)
   - Detect failure conditions
   - Execute rollback plan
   - Restore previous state
   - Notify stakeholders

## MCP Integration

Uses multiple MCP servers:

- `kubernetes`: Deploy and manage containers
- `terraform`: Provision infrastructure
- `github-actions`: Trigger deployment pipelines

## Monitoring Integration

Integrates with monitoring tools via plugin-owned libraries or MCP tools. For example, a local helper script or MCP server can fetch Datadog metrics for a service and time range before summarizing the results.

## Notification Integration

Sends updates via Slack and PagerDuty. In practice, implement this with plugin-owned scripts, MCP tools, or library wrappers that post deployment status updates and attach relevant metadata.
```

### skills/kubernetes-ops/SKILL.md

```markdown
---
name: kubernetes-ops
description: This skill should be used when deploying to Kubernetes, managing K8s resources, troubleshooting cluster issues, configuring ingress/services, scaling deployments, or working with Kubernetes manifests. Provides comprehensive Kubernetes operational knowledge and best practices.
---

# Kubernetes Operations

Comprehensive operational knowledge for managing Kubernetes clusters and workloads.

## Overview

Manage Kubernetes infrastructure effectively through:

- Deployment strategies and patterns
- Resource configuration and optimization
- Troubleshooting and debugging
- Security best practices
- Performance tuning

## Core Concepts

### Resource Management

**Deployments**: Use for stateless applications

- Rolling updates for zero-downtime deployments
- Rollback capabilities for failed deployments
- Replica management for scaling

**StatefulSets**: Use for stateful applications

- Stable network identities
- Persistent storage
- Ordered deployment and scaling

**DaemonSets**: Use for node-level services

- Log collectors
- Monitoring agents
- Network plugins

### Configuration

**ConfigMaps**: Store non-sensitive configuration

- Environment-specific settings
- Application configuration files
- Feature flags

**Secrets**: Store sensitive data

- API keys and tokens
- Database credentials
- TLS certificates

Use external secret management (Vault, AWS Secrets Manager) for production.

### Networking

**Services**: Expose applications internally

- ClusterIP for internal communication
- NodePort for external access (non-production)
- LoadBalancer for external access (production)

**Ingress**: HTTP/HTTPS routing

- Path-based routing
- Host-based routing
- TLS termination
- Load balancing

## Deployment Strategies

### Rolling Update

Default strategy, gradual replacement:
\`\`\`yaml
strategy:
type: RollingUpdate
rollingUpdate:
maxSurge: 1
maxUnavailable: 0
\`\`\`

**When to use**: Standard deployments, minor updates

### Recreate

Stop all pods, then create new ones:
\`\`\`yaml
strategy:
type: Recreate
\`\`\`

**When to use**: Stateful apps that can't run multiple versions

### Blue-Green

Run two complete environments, switch traffic:

1. Deploy new version (green)
2. Test green environment
3. Switch traffic to green
4. Keep blue for quick rollback

**When to use**: Critical services, need instant rollback

### Canary

Gradually roll out to subset of users:

1. Deploy canary version (10% traffic)
2. Monitor metrics and errors
3. Increase traffic gradually
4. Complete rollout or rollback

**When to use**: High-risk changes, want gradual validation

## Resource Configuration

### Resource Requests and Limits

Always set for production workloads:
\`\`\`yaml
resources:
requests:
memory: "256Mi"
cpu: "250m"
limits:
memory: "512Mi"
cpu: "500m"
\`\`\`

**Requests**: Guaranteed resources
**Limits**: Maximum allowed resources

### Health Checks

Essential for reliability:
\`\`\`yaml
livenessProbe:
httpGet:
path: /health
port: 8080
initialDelaySeconds: 30
periodSeconds: 10

readinessProbe:
httpGet:
path: /ready
port: 8080
initialDelaySeconds: 5
periodSeconds: 5
\`\`\`

**Liveness**: Restart unhealthy pods
**Readiness**: Remove unready pods from service

## Troubleshooting

### Common Issues

1. **Pods not starting**
   - Check: `kubectl describe pod <name>`
   - Look for: Image pull errors, resource constraints
   - Fix: Verify image name, increase resources

2. **Service not reachable**
   - Check: `kubectl get svc`, `kubectl get endpoints`
   - Look for: No endpoints, wrong selector
   - Fix: Verify pod labels match service selector

3. **High memory usage**
   - Check: `kubectl top pods`
   - Look for: Pods near memory limit
   - Fix: Increase limits, optimize application

4. **Frequent restarts**
   - Check: `kubectl get pods`, `kubectl logs <name>`
   - Look for: Liveness probe failures, OOMKilled
   - Fix: Adjust health checks, increase memory

### Debugging Commands

Get pod details:
\`\`\`bash
kubectl describe pod <name>
kubectl logs <name>
kubectl logs <name> --previous # logs from crashed container
\`\`\`

Execute commands in pod:
\`\`\`bash
kubectl exec -it <name> -- /bin/sh
kubectl exec <name> -- env
\`\`\`

Check resource usage:
\`\`\`bash
kubectl top nodes
kubectl top pods
\`\`\`

## Security Best Practices

### Pod Security

- Run as non-root user
- Use read-only root filesystem
- Drop unnecessary capabilities
- Use security contexts

Example:
\`\`\`yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
\`\`\`

### Network Policies

Restrict pod communication:
\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
spec:
  podSelector:
    matchLabels:
      app: api
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
\`\`\`

### Secrets Management

- Never commit secrets to git
- Use external secret managers
- Rotate secrets regularly
- Limit secret access with RBAC

## Performance Optimization

### Resource Tuning

1. **Start conservative**: Set low limits initially
2. **Monitor usage**: Track actual resource consumption
3. **Adjust gradually**: Increase based on metrics
4. **Set appropriate requests**: Match typical usage
5. **Set safe limits**: 2x requests for headroom

### Horizontal Pod Autoscaling

Automatically scale based on metrics:
\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
\`\`\`

## MCP Server Integration

This skill works with the kubernetes MCP server for operations such as:

- Listing pods in a namespace
- Fetching pod logs for a service or container
- Applying deployment manifests after validation

Describe the desired Kubernetes action in the skill or command instructions, then call the appropriate MCP tool at runtime rather than embedding JavaScript-style tool calls in the markdown.

## Detailed References

For in-depth information:

- **Deployment patterns**: `references/deployment-patterns.md`
- **Troubleshooting guide**: `references/troubleshooting.md`
- **Security hardening**: `references/security.md`

## Example Manifests

For copy-paste examples:

- **Basic deployment**: `examples/basic-deployment.yaml`
- **StatefulSet**: `examples/stateful-set.yaml`
- **Ingress config**: `examples/ingress-config.yaml`

## Validation Scripts

For manifest validation:
\`\`\`bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/kubernetes-ops/scripts/validate-manifest.sh deployment.yaml
\`\`\`
```

### hooks/hooks.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/security/scan-secrets.sh",
            "timeout": 30
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if this bash command is safe for production environment. Check for destructive operations, missing safeguards, and potential security issues. Commands should be idempotent and reversible.",
            "timeout": 20
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/workflow/update-status.sh",
            "timeout": 15
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/quality/check-config.sh",
            "timeout": 45
          },
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/workflow/notify-team.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/security/validate-permissions.sh",
            "timeout": 20
          }
        ]
      }
    ]
  }
}
```

## 关键特性

### 多层级组织

**Commands**：按功能组织（CI、monitoring、admin）
**Agents**：按角色拆分（orchestration 与 specialized）
**Skills**：提供丰富资源（references、examples、scripts）

### MCP 集成

三个自定义 MCP servers：

- **Kubernetes**：集群操作
- **Terraform**：基础设施供应
- **GitHub Actions**：CI/CD 自动化

### 共享库

`lib/` 中的可复用代码：

- **Core**：通用工具（logging、config、auth）
- **Integrations**：外部服务（Slack、Datadog）
- **Utils**：辅助函数（retry、validation）

### 配置管理

`config/` 中按环境区分的配置：

- **Environments**：各环境设置
- **Templates**：可复用的部署模板

### 安全自动化

多个安全 hooks：

- 写入前进行 secret 扫描
- 会话开始时验证权限
- 完成时审计配置

### 监控集成

通过 lib integrations 提供内建监控：

- Datadog 用于指标
- PagerDuty 用于告警
- Slack 用于通知

## 使用场景

1. **多环境部署**：跨 dev/staging/prod 的编排式发布
2. **基础设施即代码**：带状态管理的 Terraform 自动化
3. **CI/CD 自动化**：构建、测试、部署流水线
4. **监控与可观测性**：集成指标与告警
5. **安全约束**：自动化安全扫描与校验
6. **团队协作**：Slack 通知与状态更新

## 何时使用这种模式

- 大规模企业部署
- 多环境管理
- 复杂的 CI/CD 工作流
- 需要集成监控的场景
- 安全关键型基础设施
- 团队协作需求

## 扩展性考量

- **性能**：拆分 MCP servers 以支持并行操作
- **组织结构**：多层级目录便于扩展
- **可维护性**：共享库减少重复
- **灵活性**：环境配置支持定制化
- **安全性**：分层的安全 hooks 与校验
