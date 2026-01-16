import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  UserCircle,
  ListTodo,
  Table,
  FileText,
  PieChart,
  Boxes,
  Plug,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";

// Fuerza Tailwind a generar clases críticas (temporal)
const ForceTailwindClasses = () => (
  <div className="hidden bg-boxdark dark:bg-boxdark-2 border-strokedark text-meta-4 shadow-default shadow-card bg-meta-4/10 dark:text-gray-300" />
);

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <ListTodo className="w-5 h-5" />,
    name: "PQRS",
    subItems: [
      { name: "Lista", path: "/pqrs", pro: false },
      { name: "Crear", path: "/pqrs/create", pro: false },
    ],
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    name: "Calendar",
    path: "/calendar",
  },
  {
    icon: <UserCircle className="w-5 h-5" />,
    name: "User Profile",
    path: "/profile",
  },
  {
    name: "Forms",
    icon: <ListTodo className="w-5 h-5" />,
    subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  },
  {
    name: "Tables",
    icon: <Table className="w-5 h-5" />,
    subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  },
  {
    name: "Pages",
    icon: <FileText className="w-5 h-5" />,
    subItems: [
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChart className="w-5 h-5" />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <Boxes className="w-5 h-5" />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <Plug className="w-5 h-5" />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) return null;
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-boxdark-2
                ${openSubmenu?.type === menuType && openSubmenu?.index === index ? "bg-gray-100 dark:bg-boxdark-2" : ""}
                ${!isExpanded && !isHovered ? "justify-center" : "justify-start"}`}
            >
              <span className="flex-shrink-0 w-5 h-5">{nav.icon}</span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <>
                  <span className="flex-1 font-medium truncate">{nav.name}</span>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-200 ${
                      openSubmenu?.type === menuType && openSubmenu?.index === index ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-boxdark-2
                  ${isActive(nav.path) ? "bg-gray-100 dark:bg-boxdark-2 font-medium" : ""}
                  ${!isExpanded && !isHovered ? "justify-center" : "justify-start"}`}
              >
                <span className="flex-shrink-0 w-5 h-5">{nav.icon}</span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="flex-1 font-medium truncate">{nav.name}</span>
                )}
              </Link>
            )
          )}

          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => (subMenuRefs.current[`${menuType}-${index}`] = el)}
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-1 pl-12">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`block rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-boxdark-2
                        ${isActive(subItem.path) ? "bg-gray-100 dark:bg-boxdark-2 font-medium" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{subItem.name}</span>
                        <span className="flex items-center gap-1">
                          {subItem.new && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/50 dark:text-green-200">new</span>}
                          {subItem.pro && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">pro</span>}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <ForceTailwindClasses />

      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white dark:bg-boxdark border-r border-stroke dark:border-strokedark transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded || isMobileOpen ? "w-[280px]" : isHovered ? "w-[280px]" : "w-20"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={`py-6 flex items-center ${!isExpanded && !isHovered ? "justify-center" : "justify-start px-6"}`}>
          <Link to="/">
            {isExpanded || isHovered || isMobileOpen ? (
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            ) : (
              <img src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
            )}
          </Link>
        </div>

        {/* Menú */}
        <div className="flex flex-col overflow-y-auto px-4">
          <nav className="mb-6">
            <div className="flex flex-col gap-2">
              <div>
                <h2
                  className={`mb-4 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                    !isExpanded && !isHovered ? "text-center" : "px-2"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? "Menu" : <MoreHorizontal className="w-6 h-6 mx-auto" />}
                </h2>
                {renderMenuItems(navItems, "main")}
              </div>

              <div>
                <h2
                  className={`mb-4 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                    !isExpanded && !isHovered ? "text-center" : "px-2"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? "Others" : <MoreHorizontal className="w-6 h-6 mx-auto" />}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            </div>
          </nav>

          {(isExpanded || isHovered || isMobileOpen) && <SidebarWidget />}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;