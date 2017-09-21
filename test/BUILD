package(default_visibility=["//visibility:public"])
load("@build_bazel_rules_typescript//:defs.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:defs.bzl", "jasmine_node_test")

ts_library(
    name = "test_lib",
    srcs = glob(["*.ts"]),
    deps = ["//src"],
    tsconfig = "//:tsconfig.json",
)

jasmine_node_test(
    name = "test",
    srcs = [":test_lib"],
)