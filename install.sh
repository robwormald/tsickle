travisFoldStart "bazel-install"
  (
    mkdir tmp
    cd tmp
    curl --location --compressed https://github.com/bazelbuild/bazel/releases/download/0.5.2/bazel-0.5.2-installer-linux-x86_64.sh > bazel-0.5.2-installer-linux-x86_64.sh
    chmod +x bazel-0.5.2-installer-linux-x86_64.sh
    ./bazel-0.5.2-installer-linux-x86_64.sh --user
    cd ..
    rm -rf tmp
  )
travisFoldEnd "bazel-install"
