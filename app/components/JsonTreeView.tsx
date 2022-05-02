import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/outline";
import { useEffect, useRef } from "react";
import {
  useJsonColumnViewAPI,
  useJsonColumnViewState,
} from "~/hooks/useJsonColumnView";
import { JsonTreeViewNode, useJsonTreeViewContext } from "~/hooks/useJsonTree";
import { VirtualNode } from "~/hooks/useVirtualTree";
import { CopySelectedNodeShortcut } from "./CopySelectedNode";
import { Body } from "./Primitives/Body";
import { Mono } from "./Primitives/Mono";

export function JsonTreeView() {
  const { selectedNodeId, selectedNodeSource } = useJsonColumnViewState();
  const { goToNodeId } = useJsonColumnViewAPI();

  const { tree, parentRef } = useJsonTreeViewContext();

  // Scroll to the selected node when this component is first rendered.
  const scrolledToNodeRef = useRef(false);

  useEffect(() => {
    if (!scrolledToNodeRef.current && selectedNodeId) {
      tree.scrollToNode(selectedNodeId);
      scrolledToNodeRef.current = true;
    }
  }, [selectedNodeId, scrolledToNodeRef]);

  // Yup, this is hacky.
  // This is to prevent the selection not changing the first time you try to move to a new node in the tree
  const focusCount = useRef<number>(0);

  // This focuses and scrolls to the selected node when the selectedNodeId
  // is set from a source other than this tree (e.g. the search bar, path bar, related values).
  useEffect(() => {
    if (
      tree.focusedNodeId &&
      selectedNodeId &&
      tree.focusedNodeId !== selectedNodeId
    ) {
      if (selectedNodeId === "$") {
        return;
      }

      if (selectedNodeSource !== "tree" && focusCount.current > 0) {
        focusCount.current = focusCount.current + 1;
        tree.focusNode(selectedNodeId);
        tree.scrollToNode(selectedNodeId);
      }
    }
  }, [tree.focusedNodeId, goToNodeId, selectedNodeId, selectedNodeSource]);

  // This is what syncs the tree view's focused node to the column view selected node
  const previousFocusedNodeId = useRef<string | null>(null);

  useEffect(() => {
    let updated = false;

    if (!previousFocusedNodeId.current) {
      previousFocusedNodeId.current = tree.focusedNodeId;
      updated = true;
    }

    if (
      tree.focusedNodeId &&
      (updated || previousFocusedNodeId.current !== tree.focusedNodeId)
    ) {
      previousFocusedNodeId.current = tree.focusedNodeId;
      goToNodeId(tree.focusedNodeId, "tree");
    }
  }, [previousFocusedNodeId, tree.focusedNodeId, tree.focusNode, goToNodeId]);

  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (treeRef.current) {
      treeRef.current.focus({ preventScroll: true });
    }
  }, [treeRef.current]);

  return (
    <>
      <CopySelectedNodeShortcut />
      <div
        className="text-white w-full"
        ref={parentRef}
        style={{
          height: `calc(100vh - 106px)`,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div
          className="relative w-full outline-none"
          style={{ height: `${tree.totalSize}px` }}
          {...tree.getTreeProps()}
          ref={treeRef}
        >
          {tree.nodes.map((virtualNode) => (
            <TreeViewNode
              virtualNode={virtualNode}
              key={virtualNode.node.id}
              onToggle={(node, e) => tree.toggleNode(node.id, e)}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function TreeViewNode({
  virtualNode,
  onToggle,
  selectedNodeId,
}: {
  virtualNode: VirtualNode<JsonTreeViewNode>;
  selectedNodeId?: string;
  onToggle?: (node: JsonTreeViewNode, e: MouseEvent) => void;
}) {
  const { node, virtualItem, depth } = virtualNode;

  const indentClassName = computeTreeNodePaddingClass(depth);

  const isSelected = selectedNodeId === node.id;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: `${virtualNode.size}px`,
        transform: `translateY(${virtualNode.start}px)`,
      }}
      key={virtualNode.node.id}
      {...virtualNode.getItemProps()}
    >
      <div
        className={`h-full flex m-2 pl-5 rounded-sm select-none ${
          isSelected
            ? "bg-indigo-700"
            : virtualItem.index % 2
            ? "dark:bg-slate-900"
            : "bg-slate-200 bg-opacity-90 dark:bg-slate-800 dark:bg-opacity-30"
        }`}
      >
        <div className={`${indentClassName} w-2/6 items-center flex`}>
          {node.children && node.children.length > 0 && (
            <span
              onClick={(e) => {
                if (onToggle) {
                  e.preventDefault();
                  onToggle(node, e.nativeEvent);
                }
              }}
            >
              {virtualNode.isCollapsed ? (
                <ChevronRightIcon
                  className={`w-4 h-4 mr-1 -ml-5 ${
                    isSelected
                      ? "text-slate-100"
                      : "text-slate-600 dark:text-slate-100"
                  }`}
                />
              ) : (
                <ChevronDownIcon
                  className={`w-4 h-4 mr-1 -ml-5 ${
                    isSelected
                      ? "text-slate-100"
                      : "text-slate-600 dark:text-slate-100"
                  }`}
                />
              )}
            </span>
          )}

          <Body
            className={`truncate whitespace-nowrap pr-2 ${
              isSelected
                ? "text-slate-100"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {node.longTitle ?? node.name}
          </Body>
        </div>

        <div className="flex w-4/6 items-center">
          <span className="mr-2">
            {node.icon && (
              <node.icon
                className={`h-5 w-5 ${
                  isSelected
                    ? "text-slate-100"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              />
            )}
          </span>
          {node.subtitle && (
            <Mono
              className={`truncate pr-1 transition ${
                isSelected
                  ? "text-slate-100"
                  : "text-slate-500 dark:text-slate-200"
              }`}
            >
              {node.subtitle}
            </Mono>
          )}
        </div>
      </div>
    </div>
  );
}

function computeTreeNodePaddingClass(depth: number) {
  switch (depth) {
    case 0:
      return "pl-[4px]";
    case 1:
      return "pl-[calc(12px_+_4px)]";
    case 2:
      return "pl-[calc(12px_*_2_+_4px)]";
    case 3:
      return "pl-[calc(12px_*_3_+_4px)]";
    case 4:
      return "pl-[calc(12px_*_4_+_4px)]";
    case 5:
      return "pl-[calc(12px_*_5_+_4px)]";
    case 6:
      return "pl-[calc(12px_*_6_+_4px)]";
    case 7:
      return "pl-[calc(12px_*_7_+_4px)]";
    case 8:
      return "pl-[calc(12px_*_8_+_4px)]";
    case 9:
      return "pl-[calc(12px_*_9_+_4px)]";
    case 10:
      return "pl-[calc(12px_*_10_+_4px)]";
    default:
      return "pl-[calc(12px_*_11_+_4px)]";
  }
}
