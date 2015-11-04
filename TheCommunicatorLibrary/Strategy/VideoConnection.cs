using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public class VideoConnection : IConnection
    {
        public string a { get; set; }
        public void Connect(Contact One, Contact Two)
        {
            a = "4";
        }
        public override string ToString()
        {
            return GetType().ToString();
        }
    }
}
