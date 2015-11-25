using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public interface IConnection
    {
        void Connect(Contact one, Contact two);

        string ToString();
    }
}
