load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

#git_repository(
#    name = "build_bazel_rules_nodejs",
#    remote = "https://github.com/alexeagle/rules_nodejs.git",
#    commit = "e6298c7",
#)

local_repository(
    name = "build_bazel_rules_nodejs",
    path = "../rules_nodejs",
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories")

# NOTE: this rule installs nodejs, npm, and yarn, but does NOT install
# your npm dependencies. You must still run the package manager.
node_repositories(package_json = ["//:package.json"])

# Include @bazel/typescript in package.json#devDependencies
local_repository(
    name = "build_bazel_rules_typescript",
    path = "node_modules/@bazel/typescript",
)
